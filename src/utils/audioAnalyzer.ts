export interface AudioPeak {
  time: number;
  amplitude: number;
}

type AudioContextConstructor = new (options?: AudioContextOptions) => AudioContext;

const errorMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : String(error);

const mixToMono = (buffer: AudioBuffer): Float32Array => {
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      mono[index] += data[index] / buffer.numberOfChannels;
    }
  }
  return mono;
};

export const detectTopAudioPeaks = async (
  blob: Blob,
  maxPeaks = 2
): Promise<AudioPeak[]> => {
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio API is not supported in this browser.');

  const context = new AudioContextClass();
  let buffer: AudioBuffer;
  try {
    buffer = await context.decodeAudioData(await blob.arrayBuffer());
  } catch (error) {
    throw new Error(`Could not decode audio for peak detection: ${errorMessage(error)}`);
  } finally {
    await context.close().catch(() => {});
  }

  if (!buffer || !buffer.length || !Number.isFinite(buffer.duration) || buffer.duration <= 0) {
    throw new Error('No audio track was found in this video.');
  }

  const mono = mixToMono(buffer);
  const windowSeconds = 0.25;
  const windowSamples = Math.max(1, Math.floor(buffer.sampleRate * windowSeconds));
  const frameCount = Math.floor(mono.length / windowSamples);
  if (frameCount < 2) return [];

  const rms = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * windowSamples;
    let sum = 0;
    for (let index = start; index < start + windowSamples; index += 1) {
      sum += mono[index] * mono[index];
    }
    rms[frame] = Math.sqrt(sum / windowSamples);
  }

  const smoothed = new Float32Array(frameCount);
  for (let frame = 0; frame < frameCount; frame += 1) {
    let total = 0;
    let count = 0;
    for (let offset = -2; offset <= 2; offset += 1) {
      const neighbor = frame + offset;
      if (neighbor < 0 || neighbor >= frameCount) continue;
      total += rms[neighbor];
      count += 1;
    }
    smoothed[frame] = total / Math.max(count, 1);
  }

  let globalMax = 0;
  for (let frame = 0; frame < frameCount; frame += 1) {
    globalMax = Math.max(globalMax, smoothed[frame]);
  }
  if (globalMax < 0.01) return [];

  const minGapFrames = Math.max(1, Math.round((Math.max(1.5, buffer.duration * 0.08) / windowSeconds)));
  const candidates = Array.from({ length: frameCount }, (_, index) => index).sort(
    (a, b) => smoothed[b] - smoothed[a]
  );
  const chosen: number[] = [];

  for (const frame of candidates) {
    if (smoothed[frame] < globalMax * 0.35) break;
    if (chosen.every((other) => Math.abs(other - frame) >= minGapFrames)) {
      chosen.push(frame);
      if (chosen.length >= Math.max(1, maxPeaks)) break;
    }
  }

  return chosen
    .map((frame) => ({
      time: Math.min(Math.max(0, (frame * windowSamples) / buffer.sampleRate), buffer.duration - 0.01),
      amplitude: smoothed[frame],
    }))
    .sort((a, b) => a.time - b.time);
};
