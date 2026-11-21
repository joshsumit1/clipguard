import { CaptionLanguage, CaptionSegment } from '@/types';

export interface TranscriptionUpdate {
  percent: number;
  message: string;
}

interface AsrChunk {
  text?: string;
  timestamp?: [number | null, number | null] | null;
}

interface AsrResult {
  text?: string;
  chunks?: AsrChunk[];
}

type Transcriber = (
  audio: Float32Array,
  options: Record<string, unknown>
) => Promise<AsrResult>;

interface TransformersModule {
  env: {
    allowLocalModels: boolean;
    allowRemoteModels: boolean;
    localModelPath: string;
    backends: { onnx: { wasm: { wasmPaths: string; numThreads: number } } };
  };
  pipeline: (
    task: string,
    model: string,
    options: Record<string, unknown>
  ) => Promise<unknown>;
}

interface ProgressEvent {
  status?: string;
  progress?: number;
  file?: string;
  message?: string;
  error?: string | { message?: string };
}

interface ModelChoice {
  id: string;
  label: string;
}

const MODELS: ModelChoice[] = [
  { id: 'onnx-community/whisper-small', label: 'Whisper Small' },
  { id: 'onnx-community/whisper-tiny', label: 'Whisper Tiny (local fallback)' },
];

const SAMPLE_RATE = 16000;
const BLOCK_SECONDS = 30;
const BLOCK_SAMPLES = SAMPLE_RATE * BLOCK_SECONDS;

type OfflineContextConstructor = new (
  numberOfChannels: number,
  length: number,
  sampleRate: number
) => OfflineAudioContext;

let transformersPromise: Promise<TransformersModule> | null = null;
const transcriberPromises = new Map<string, Promise<Transcriber>>();

const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : String(error);

export const formatSrtTime = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.floor((safe - Math.floor(safe)) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

export const parseSrtTime = (value: string): number => {
  const match = value.trim().match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
  if (!match) return 0;
  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(match[4]) / 1000
  );
};

export const formatCaptionsAsSrt = (segments: CaptionSegment[]): string =>
  segments
    .map(
      (segment, index) =>
        `${index + 1}\n${formatSrtTime(segment.start)} --> ${formatSrtTime(segment.end)}\n${segment.text.trim()}\n`
    )
    .join('\n');

export const parseSrtCaptions = (srt: string): CaptionSegment[] => {
  const blocks = srt.trim().split(/\n\s*\n/).filter(Boolean);
  return blocks
    .map((block, index) => {
      const lines = block.split('\n').filter((line) => line.trim().length > 0);
      const timeLine = lines.find((line) => line.includes('-->'));
      if (!timeLine) return null;
      const [startText, endText] = timeLine.split('-->');
      const start = parseSrtTime(startText);
      const end = parseSrtTime(endText);
      const text = lines
        .filter((line) => line !== timeLine && !/^\d+$/.test(line.trim()))
        .join(' ')
        .trim();
      if (!text || end <= start) return null;
      return { id: `caption-${index}-${start}`, start, end, text };
    })
    .filter((segment): segment is CaptionSegment => segment !== null)
    .sort((a, b) => a.start - b.start);
};

const getTransformers = (): Promise<TransformersModule> => {
  if (!transformersPromise) {
    transformersPromise = (async () => {
      const moduleUrl = '/vendor/transformers.min.js';
      const module = (await import(
        /* webpackIgnore: true */ moduleUrl
      )) as unknown as TransformersModule;

      module.env.allowLocalModels = true;
      module.env.allowRemoteModels = true;
      module.env.localModelPath = '/models/';
      module.env.backends.onnx.wasm.wasmPaths = '/ort/';
      module.env.backends.onnx.wasm.numThreads = 1;
      return module;
    })().catch((error) => {
      transformersPromise = null;
      throw error;
    });
  }
  return transformersPromise;
};

const decodeAudioToMono = async (
  blob: Blob,
  onProgress?: (update: TranscriptionUpdate) => void
): Promise<Float32Array> => {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.');

  onProgress?.({ percent: 2, message: 'Decoding the video audio track...' });
  const decodeContext = new AudioContextClass();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeContext.decodeAudioData(await blob.arrayBuffer());
  } catch (error) {
    throw new Error(`Could not decode video audio: ${errorMessage(error)}`);
  } finally {
    await decodeContext.close().catch(() => {});
  }

  if (!decoded || !decoded.length || !Number.isFinite(decoded.duration)) {
    throw new Error('No audio track was found in this video.');
  }

  const OfflineContext: OfflineContextConstructor | undefined =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: OfflineContextConstructor })
      .webkitOfflineAudioContext;
  if (!OfflineContext) {
    throw new Error('OfflineAudioContext is not supported in this browser.');
  }

  const length = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE));
  onProgress?.({
    percent: 6,
    message: `Resampling to mono 16 kHz (${decoded.duration.toFixed(1)}s / ${length.toLocaleString()} samples)...`,
  });

  const offlineContext = new OfflineContext(1, length, SAMPLE_RATE);
  const source = offlineContext.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineContext.destination);
  source.start(0);
  const rendered = await offlineContext.startRendering();
  return new Float32Array(rendered.getChannelData(0));
};

const getTranscriber = (
  model: ModelChoice,
  onProgress?: (update: TranscriptionUpdate) => void
): Promise<Transcriber> => {
  const cached = transcriberPromises.get(model.id);
  if (cached) return cached;

  const load = (async () => {
    const { pipeline } = await getTransformers();
    let loadedPercent = 12;
    let downloadError: string | null = null;

    onProgress?.({
      percent: loadedPercent,
      message: `Loading ${model.label} from Hugging Face (first run downloads Whisper weights)...`,
    });

    const transcriber = (await pipeline('automatic-speech-recognition', model.id, {
      device: 'wasm',
      dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
      progress_callback: (event: ProgressEvent) => {
        if (event.status === 'error' || downloadError) {
          const detail =
            typeof event.error === 'string'
              ? event.error
              : event.error?.message || event.message;
          downloadError = downloadError || detail || 'Unknown Whisper model download error.';
          return;
        }

        if (event.status === 'progress' && typeof event.progress === 'number') {
          const progress = Math.min(100, Math.max(0, event.progress));
          const next = 12 + Math.round(progress * 0.28);
          if (next > loadedPercent) {
            loadedPercent = next;
            onProgress?.({
              percent: loadedPercent,
              message: `Downloading ${model.label} · ${event.file ?? 'model file'}: ${Math.round(progress)}%`,
            });
          }
          return;
        }

        if (event.status === 'done' && event.file) {
          onProgress?.({
            percent: Math.max(loadedPercent, 40),
            message: `Loaded ${event.file} for ${model.label}.`,
          });
        }
      },
    })) as unknown as Transcriber;

    if (downloadError) throw new Error(downloadError);
    onProgress?.({ percent: 42, message: `${model.label} is ready.` });
    return transcriber;
  })().catch((error) => {
    transcriberPromises.delete(model.id);
    throw error;
  });

  transcriberPromises.set(model.id, load);
  return load;
};

const loadTranscriberWithFallback = async (
  onProgress: (update: TranscriptionUpdate) => void
): Promise<{ model: ModelChoice; transcriber: Transcriber }> => {
  const failures: string[] = [];

  for (let index = 0; index < MODELS.length; index += 1) {
    const model = MODELS[index];
    try {
      const transcriber = await getTranscriber(model, onProgress);
      return { model, transcriber };
    } catch (error) {
      const detail = errorMessage(error);
      failures.push(`${model.id}: ${detail}`);
      if (index + 1 < MODELS.length) {
        onProgress({
          percent: 42,
          message: `${model.label} unavailable (${detail}). Falling back to ${MODELS[index + 1].label}...`,
        });
      }
    }
  }

  throw new Error(`Could not load any Whisper model. ${failures.join(' | ')}`);
};

const containsDevanagari = (text: string) => /[\u0900-\u097F]/.test(text);

const segmentsFromResult = (
  result: AsrResult,
  offsetSeconds: number,
  blockDuration: number
): CaptionSegment[] => {
  const segments: CaptionSegment[] = [];
  const blockEnd = offsetSeconds + blockDuration;

  if (result.chunks && result.chunks.length > 0) {
    result.chunks.forEach((chunk, index) => {
      const text = (chunk.text || '').trim();
      if (!text) return;

      const startRaw = chunk.timestamp?.[0];
      const endRaw = chunk.timestamp?.[1];
      const estimate = blockDuration / result.chunks!.length;
      const start = offsetSeconds + (typeof startRaw === 'number' ? startRaw : index * estimate);
      const end =
        offsetSeconds +
        (typeof endRaw === 'number' ? endRaw : Math.min(start - offsetSeconds + estimate, blockDuration));

      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
      const boundedStart = Math.min(Math.max(start, offsetSeconds), blockEnd - 0.01);
      const boundedEnd = Math.min(end, blockEnd);
      if (boundedEnd <= boundedStart) return;

      segments.push({ id: `caption-${boundedStart}-${index}`, start: boundedStart, end: boundedEnd, text });
    });
    return segments;
  }

  const text = (result.text || '').trim();
  if (!text) return [];
  const sentences = text
    .split(/(?<=[.!?।])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const step = blockDuration / Math.max(sentences.length, 1);
  return sentences.map((sentence, index) => ({
    id: `caption-${offsetSeconds}-${index}`,
    start: offsetSeconds + index * step,
    end: offsetSeconds + Math.min((index + 1) * step, blockDuration),
    text: sentence,
  }));
};

const detectSpokenLanguage = async (
  transcriber: Transcriber,
  audio: Float32Array
): Promise<'english' | 'hindi'> => {
  const preview = audio.subarray(0, Math.min(audio.length, SAMPLE_RATE * 15));
  const result = await transcriber(preview, {
    language: 'hindi',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
  });
  const text = [result.text || '', ...(result.chunks || []).map((chunk) => chunk.text || '')].join(' ');
  return containsDevanagari(text) ? 'hindi' : 'english';
};

export const transcribeVideoCaptions = async (
  blob: Blob,
  language: CaptionLanguage,
  onProgress?: (update: TranscriptionUpdate) => void
): Promise<CaptionSegment[]> => {
  let lastPercent = 0;
  const update = (next: TranscriptionUpdate) => {
    lastPercent = Math.max(lastPercent, Math.min(100, Math.round(next.percent)));
    onProgress?.({ percent: lastPercent, message: next.message });
  };
  const report = (percent: number, message: string) => update({ percent, message });

  report(1, 'Preparing audio for local Whisper transcription...');
  const audio = await decodeAudioToMono(blob, update);
  if (audio.length === 0) throw new Error('No audio track was found in this video.');

  const { model, transcriber } = await loadTranscriberWithFallback(update);

  let resolvedLanguage: 'english' | 'hindi' = language === 'english' ? 'english' : 'hindi';
  let task: 'transcribe' | 'translate' = 'transcribe';

  if (language === 'hinglish') {
    report(43, 'Detecting Hindi vs English speech for Roman/English captions...');
    try {
      resolvedLanguage = await detectSpokenLanguage(transcriber, audio);
    } catch (error) {
      onProgress?.({
        percent: lastPercent,
        message: `Language detection unavailable (${errorMessage(error)}). Using Hindi → English translation.`,
      });
      resolvedLanguage = 'hindi';
    }
    task = resolvedLanguage === 'hindi' ? 'translate' : 'transcribe';
    report(
      45,
      resolvedLanguage === 'hindi'
        ? 'Hindi audio detected → translating to Roman/English script...'
        : 'Roman/English speech detected → preserving the original script...'
    );
  } else {
    report(
      45,
      language === 'english'
        ? 'Transcribing English speech with Whisper...'
        : 'Transcribing Hindi speech with Whisper...'
    );
  }

  const segments: CaptionSegment[] = [];
  const totalBlocks = Math.ceil(audio.length / BLOCK_SAMPLES);

  for (let blockIndex = 0; blockIndex < totalBlocks; blockIndex += 1) {
    const startSample = blockIndex * BLOCK_SAMPLES;
    const block = audio.subarray(startSample, Math.min(audio.length, startSample + BLOCK_SAMPLES));
    const blockDuration = block.length / SAMPLE_RATE;

    report(
      46 + ((blockIndex + 1) / totalBlocks) * 49,
      `Transcribing with ${model.label} · block ${blockIndex + 1} of ${totalBlocks} (${language})...`
    );

    let result: AsrResult;
    try {
      result = await transcriber(block, {
        language: resolvedLanguage,
        task,
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
      });
    } catch (error) {
      throw new Error(
        `Whisper transcription failed at ${(startSample / SAMPLE_RATE).toFixed(1)}s: ${errorMessage(error)}`
      );
    }

    segments.push(...segmentsFromResult(result, startSample / SAMPLE_RATE, blockDuration));
  }

  report(100, `Generated ${segments.length} editable caption lines.`);
  return segments.sort((a, b) => a.start - b.start);
};
