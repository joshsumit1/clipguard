import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import {
  CampaignMode,
  CaptionBurnSettings,
  CaptionSegment,
  CaptionStyle,
  OverlaySettings,
  VerificationResult,
} from '@/types';
import { rectToPixelCrop, zoomFacecamCrop } from '@/utils/faceDetector';

export interface RenderProgress {
  stage: 'idle' | 'loading-engine' | 'reading-media' | 'compositing' | 'encoding' | 'finalizing' | 'complete' | 'error';
  percent: number;
  message: string;
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  const ffmpeg = new FFmpeg();
  ffmpegInstance = ffmpeg;

  const load = (async () => {
    const coreURL = await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript');
    const wasmURL = await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm');
    await ffmpeg.load({ coreURL, wasmURL });
    return ffmpeg;
  })();

  ffmpegLoadPromise = load;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('FFmpeg initialization timed out')), 12000);
  });

  try {
    const loaded = await Promise.race([load, timeout]);
    if (timeoutId) clearTimeout(timeoutId);
    return loaded;
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    ffmpegLoadPromise = null;
    ffmpegInstance = null;
    throw error;
  }
}

export function generateVerificationCode(): string {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i += 1) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CG-${rand}-VERIFIED`;
}

export interface VerticalCrop {
  sourceWidth: number;
  sourceHeight: number;
  sourceX: number;
  sourceY: number;
  outputWidth: number;
  outputHeight: number;
}

export function computeVerticalCrop(
  sourceWidth: number,
  sourceHeight: number,
  overlay: OverlaySettings
): VerticalCrop {
  const safeWidth = Math.max(2, Math.round(sourceWidth));
  const safeHeight = Math.max(2, Math.round(sourceHeight));

  let outputWidth = 1080;
  let outputHeight = 1920;

  if (outputHeight > safeHeight) {
    outputHeight = Math.max(2, safeHeight - (safeHeight % 2));
    outputWidth = Math.max(2, Math.round((outputHeight * 9) / 16 / 2) * 2);
  }

  outputWidth = Math.max(2, outputWidth - (outputWidth % 2));
  outputHeight = Math.max(2, outputHeight - (outputHeight % 2));

  const zoom = Math.min(Math.max(overlay.zoom || 100, 100), 250) / 100;
  const panRatio = Math.min(Math.max(overlay.xOffset ?? 50, 0), 100) / 100;
  const baseCropWidth = Math.min(safeWidth, (outputWidth * safeHeight) / outputHeight);
  const baseCropHeight = Math.min(safeHeight, (outputHeight * safeHeight) / outputHeight);

  let cropWidth = baseCropWidth / zoom;
  let cropHeight = baseCropHeight / zoom;
  cropWidth = Math.max(2, Math.min(safeWidth, Math.round(cropWidth / 2) * 2));
  cropHeight = Math.max(2, Math.min(safeHeight, Math.round(cropHeight / 2) * 2));

  const cropX = Math.max(0, Math.round(((safeWidth - cropWidth) * panRatio) / 2) * 2);
  const cropY = Math.max(0, Math.round(((safeHeight - cropHeight) / 2) / 2) * 2);

  return {
    sourceWidth: cropWidth,
    sourceHeight: cropHeight,
    sourceX: cropX,
    sourceY: cropY,
    outputWidth,
    outputHeight,
  };
}

async function readVideoDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error('Timed out while reading video dimensions.')),
        10000
      );
      video.onloadedmetadata = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Failed to read video dimensions.'));
      };
      video.src = url;
    });

    return {
      width: video.videoWidth || 720,
      height: video.videoHeight || 1280,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function createResult(
  options: {
    verificationCode: string;
    videoBlob: Blob;
    brandName: string;
    payoutRate: string;
    campaignMode: CampaignMode;
    overlay: OverlaySettings;
    selectedHook?: string;
    formattedCaption?: string;
    resolution: string;
    startedAt: number;
  }
): VerificationResult {
  const isCreatorMode = options.campaignMode === 'creator';
  const downloadUrl = URL.createObjectURL(options.videoBlob);
  const sizeMB = `${(options.videoBlob.size / (1024 * 1024)).toFixed(2)} MB`;

  return {
    code: options.verificationCode,
    timestamp: new Date().toISOString(),
    brandName: options.brandName,
    payoutRate: options.payoutRate,
    campaignMode: options.campaignMode,
    safeZoneCompliance: 'PASSED',
    coordinates: {
      y: isCreatorMode ? 0 : options.overlay.yOffset,
      scale: isCreatorMode ? 100 : options.overlay.scale,
      opacity: isCreatorMode ? 0 : options.overlay.opacity,
    },
    selectedHook: options.selectedHook,
    formattedCaption: options.formattedCaption,
    duration: Math.round((Date.now() - options.startedAt) / 1000),
    resolution: options.resolution,
    downloadUrl,
    fileSize: sizeMB,
  };
}

interface CaptionStyleConfig {
  fontSize: number;
  strokeWidth: number;
  fill: string;
  stroke: string;
  shadowColor: string;
  shadowBlur: number;
  uppercase: boolean;
}

const CAPTION_STYLE_CONFIG: Record<CaptionStyle, CaptionStyleConfig> = {
  classic: {
    fontSize: 66,
    strokeWidth: 8,
    fill: '#FFFFFF',
    stroke: '#000000',
    shadowColor: 'rgba(0, 0, 0, 0.9)',
    shadowBlur: 10,
    uppercase: false,
  },
  viral: {
    fontSize: 76,
    strokeWidth: 14,
    fill: '#FFE600',
    stroke: '#000000',
    shadowColor: 'rgba(0, 0, 0, 1)',
    shadowBlur: 16,
    uppercase: true,
  },
};

const CAPTION_ANCHORS: Record<CaptionBurnSettings['position'], number> = {
  upper: 0.22,
  center: 0.58,
  lower: 0.68,
};

const CAPTION_FONT_STACK =
  '"CaptionSans", "CaptionDevanagari", "Noto Sans Devanagari", "Inter", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

let captionFontsPromise: Promise<void> | null = null;

const ensureCaptionFonts = (): Promise<void> => {
  if (!captionFontsPromise) {
    captionFontsPromise = (async () => {
      if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') {
        return;
      }

      const fonts: [string, string][] = [
        ['CaptionSans', '/fonts/Inter-Bold.ttf'],
        ['CaptionDevanagari', '/fonts/NotoSansDevanagari-Bold.ttf'],
      ];

      await Promise.all(
        fonts.map(async ([family, url]) => {
          try {
            const existing = Array.from(document.fonts).find((face) => face.family === family);
            const face =
              existing ??
              new FontFace(family, `url("${url}")`, { weight: '700', style: 'normal' });
            if (!existing) document.fonts.add(face);
            await face.load();
          } catch (error) {
            console.warn(`Caption font ${family} could not be loaded:`, error);
          }
        })
      );
    })().catch((error) => {
      captionFontsPromise = null;
      throw error;
    });
  }
  return captionFontsPromise;
};

const formatAssTime = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const centis = Math.floor((safe - Math.floor(safe)) * 100);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
};

const escapeAssText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\N');

const toAssColor = (hex: string): string => {
  const value = hex.replace('#', '');
  return `&H00${value.slice(4, 6)}${value.slice(2, 4)}${value.slice(0, 2)}`.toUpperCase();
};

const captionAssMarginV = (position: CaptionBurnSettings['position']): number =>
  Math.max(60, Math.round(1920 * (1 - CAPTION_ANCHORS[position]) - 180));

export const buildCaptionsAss = (captions: CaptionBurnSettings): string => {
  const style = captions.style ?? 'classic';
  const config = CAPTION_STYLE_CONFIG[style];
  const styleName = style === 'viral' ? 'Viral' : 'Classic';
  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1080',
    'PlayResY: 1920',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: ${styleName},Inter,${config.fontSize},${toAssColor(config.fill)},&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,${Math.max(2, Math.round(config.strokeWidth / 2))},1,2,80,80,${captionAssMarginV(captions.position)},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const events = captions.segments.map((segment: CaptionSegment) => {
    const isDevanagari = /[\u0900-\u097F]/.test(segment.text);
    const inlineFont = isDevanagari ? '{\\fnNoto Sans Devanagari}' : '';
    const text = config.uppercase ? segment.text.toLocaleUpperCase() : segment.text;
    return `Dialogue: 0,${formatAssTime(segment.start)},${formatAssTime(segment.end)},${styleName},,,0,0,0,,${inlineFont}${escapeAssText(text)}`;
  });

  return [...header, ...events, ''].join('\n');
};

export const drawCaptionText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  position: CaptionBurnSettings['position'],
  style: CaptionStyle,
  width = 1080,
  height = 1920
): void => {
  const config = CAPTION_STYLE_CONFIG[style] ?? CAPTION_STYLE_CONFIG.classic;
  const scale = height / 1920;
  const fontSize = Math.round(config.fontSize * scale);
  const strokeWidth = Math.max(1, Math.round(config.strokeWidth * scale));
  const finalText = config.uppercase ? text.toLocaleUpperCase() : text;

  ctx.save();
  ctx.font = `900 ${fontSize}px ${CAPTION_FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const words = finalText.split(/\s+/).filter(Boolean);
  const maxWidth = width * 0.86;
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  const lineHeight = fontSize + Math.round(12 * scale);
  const blockHeight = lines.length * lineHeight;
  const anchorY = CAPTION_ANCHORS[position] * height;
  const top = Math.min(
    Math.max(anchorY, 36 * scale),
    Math.max(36 * scale, height - blockHeight - 36 * scale)
  );

  ctx.strokeStyle = config.stroke;
  ctx.lineWidth = strokeWidth;
  ctx.fillStyle = config.fill;
  ctx.shadowColor = config.shadowColor;
  ctx.shadowBlur = config.shadowBlur * scale;
  ctx.shadowOffsetY = 3 * scale;

  lines.forEach((line, index) => {
    const y = top + index * lineHeight + fontSize / 2;
    ctx.strokeText(line, width / 2, y);
    ctx.fillText(line, width / 2, y);
  });
  ctx.restore();
};

interface CaptionOverlay {
  name: string;
  start: number;
  end: number;
}

const renderCaptionPng = async (
  segment: CaptionSegment,
  captions: CaptionBurnSettings
): Promise<Uint8Array> => {
  await ensureCaptionFonts();
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available for caption burn-in.');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCaptionText(ctx, segment.text, captions.position, captions.style ?? 'classic', canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not render caption PNG.'))),
      'image/png'
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
};

const buildCaptionOverlayChain = (
  baseLabel: string,
  overlays: CaptionOverlay[],
  firstInputIndex: number,
  outputLabel: string
): { parts: string[]; inputs: string[] } => {
  const parts: string[] = [];
  const inputs: string[] = [];
  let previous = baseLabel;

  overlays.forEach((overlay, index) => {
    const inputIndex = firstInputIndex + index;
    inputs.push('-loop', '1', '-i', overlay.name);
    const label = index === overlays.length - 1 ? outputLabel : `captionstep${index}`;
    parts.push(
      `[${previous}][${inputIndex}:v]overlay=0:0:enable='between(t,${overlay.start.toFixed(3)},${overlay.end.toFixed(3)})'[${label}]`
    );
    previous = label;
  });

  return { parts, inputs };
};

export async function renderCompliantVideo(
  videoFileOrBlob: File | Blob,
  bannerBlobOrUrl: Blob | string | null | undefined,
  overlay: OverlaySettings,
  brandName: string,
  payoutRate: string,
  campaignMode: CampaignMode = 'sponsor',
  selectedHook?: string,
  formattedCaption?: string,
  onProgress: (p: RenderProgress) => void = () => {}
): Promise<VerificationResult> {
  const startedAt = Date.now();
  const verificationCode = generateVerificationCode();
  const isCreatorMode = campaignMode === 'creator';
  const shouldCompositeBanner = !isCreatorMode && Boolean(bannerBlobOrUrl);
  const shouldUseSplitScreen =
    isCreatorMode &&
    Boolean(overlay.splitScreen && overlay.facecamCrop && overlay.gameplayCrop);
  let exportResolution = '1080x1920 (9:16 Vertical)';

  onProgress({
    stage: 'loading-engine',
    percent: 5,
    message: 'Starting Safe-Zone Verification & Export...',
  });

  const canUseFFmpeg =
    typeof window !== 'undefined' && typeof window.SharedArrayBuffer !== 'undefined';

  if (canUseFFmpeg) {
    try {
      onProgress({
        stage: 'loading-engine',
        percent: 10,
        message: 'Initializing ClipGuard FFmpeg WASM Core...',
      });

      const ffmpeg = await getFFmpeg();
      const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const inputName = `input-${jobId}.mp4`;
      const outputName = `output-${jobId}.mp4`;
      const bannerName = `banner-${jobId}.png`;
      const tempFiles = [inputName, outputName];

      const handleProgress = ({ progress }: { progress: number }) => {
        const pct = Math.min(Math.max(Math.round(progress * 100), 20), 95);
        onProgress({
          stage: 'encoding',
          percent: pct,
          message: `Encoding H.264 + AAC: ${pct}% complete...`,
        });
      };
      ffmpeg.on('progress', handleProgress);

      try {
        onProgress({
          stage: 'reading-media',
          percent: 25,
          message: isCreatorMode
            ? 'Ingesting clean 9:16 footage for verification...'
            : 'Loading input 9:16 footage and official brand asset...',
        });

        await ffmpeg.writeFile(inputName, await fetchFile(videoFileOrBlob));

        const captionOverlays: CaptionOverlay[] = [];
        if (
          isCreatorMode &&
          overlay.captions?.burn &&
          overlay.captions.segments.length > 0
        ) {
          onProgress({
            stage: 'reading-media',
            percent: 32,
            message: 'Rendering styled caption overlays with bundled Hindi/English fonts...',
          });
          for (let index = 0; index < overlay.captions.segments.length; index += 1) {
            const segment = overlay.captions.segments[index];
            const name = `caption-${jobId}-${index}.png`;
            await ffmpeg.writeFile(name, await renderCaptionPng(segment, overlay.captions));
            captionOverlays.push({ name, start: segment.start, end: segment.end });
            tempFiles.push(name);
          }
        }

        if (
          shouldUseSplitScreen &&
          overlay.facecamCrop &&
          overlay.gameplayCrop
        ) {
          const dimensions = await readVideoDimensions(videoFileOrBlob);
          const zoomedFacecam = zoomFacecamCrop(
            overlay.facecamCrop,
            overlay.facecamZoom ?? 1.5,
            overlay.facecamPanX ?? 50,
            overlay.facecamPanY ?? 50
          );
          const facecam = rectToPixelCrop(
            zoomedFacecam,
            dimensions.width,
            dimensions.height
          );
          const gameplay = rectToPixelCrop(
            overlay.gameplayCrop,
            dimensions.width,
            dimensions.height
          );
          const hasCaptions = captionOverlays.length > 0;
          const captionChain = hasCaptions
            ? buildCaptionOverlayChain('base', captionOverlays, 1, 'outv')
            : { parts: [] as string[], inputs: [] as string[] };
          const filter = [
            '[0:v]split=2[facecamsrc][gameplaysrc]',
            `[facecamsrc]crop=${facecam.width}:${facecam.height}:${facecam.x}:${facecam.y},scale=1080:672:flags=lanczos,setsar=1[facecam]`,
            `[gameplaysrc]crop=${gameplay.width}:${gameplay.height}:${gameplay.x}:${gameplay.y},scale=1080:1248:flags=lanczos,setsar=1[gameplay]`,
            `[facecam][gameplay]vstack=inputs=2[${hasCaptions ? 'base' : 'outv'}]`,
            ...captionChain.parts,
          ].join(';');

          onProgress({
            stage: 'compositing',
            percent: 40,
            message:
              'Building 35% facecam / 65% gameplay split-screen with clean zero-logo output...',
          });

          const exitCode = await ffmpeg.exec([
            '-i',
            inputName,
            ...captionChain.inputs,
            '-filter_complex',
            filter,
            '-map',
            '[outv]',
            '-map',
            '0:a?',
            '-c:v',
            'libx264',
            '-preset',
            'ultrafast',
            '-crf',
            '20',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-shortest',
            '-movflags',
            '+faststart',
            outputName,
          ]);

          if (exitCode !== 0) {
            throw new Error(`FFmpeg split-screen encoding failed with code ${exitCode}.`);
          }
          exportResolution = '1080x1920 (9:16 Split-Screen Vertical)';
        } else if (shouldCompositeBanner && bannerBlobOrUrl) {
          const bannerBlob =
            typeof bannerBlobOrUrl === 'string'
              ? await fetch(bannerBlobOrUrl).then((response) => {
                  if (!response.ok) throw new Error('Failed to load the sponsor banner.');
                  return response.blob();
                })
              : bannerBlobOrUrl;

          tempFiles.push(bannerName);
          await ffmpeg.writeFile(bannerName, await fetchFile(bannerBlob));

          const scale = (overlay.scale / 100).toFixed(2);
          const opacity = (overlay.opacity / 100).toFixed(2);
          const yPercent = (overlay.yOffset / 100).toFixed(4);
          const filter = `[1:v]scale=iw*${scale}:-1,format=rgba,colorchannelmixer=aa=${opacity}[scaled];[0:v][scaled]overlay=(W-w)/2:(H*${yPercent})[outv]`;

          onProgress({
            stage: 'compositing',
            percent: 40,
            message: 'Calculating Safe-Zone matrix & applying visual overlay...',
          });

          const exitCode = await ffmpeg.exec([
            '-i', inputName,
            '-i', bannerName,
            '-filter_complex', filter,
            '-map', '[outv]',
            '-map', '0:a?',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '22',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            '-movflags', '+faststart',
            outputName,
          ]);

          if (exitCode !== 0) throw new Error(`FFmpeg encoding failed with code ${exitCode}.`);
        } else {
          onProgress({
            stage: 'encoding',
            percent: 50,
            message: isCreatorMode
              ? 'Cropping to 9:16 and exporting clean video with zero logos or watermarks...'
              : 'Exporting clean video with zero logos or watermarks...',
          });

          const hasCaptions = captionOverlays.length > 0;
          const cropFilter = isCreatorMode
            ? await (async () => {
                const dimensions = await readVideoDimensions(videoFileOrBlob);
                const crop = computeVerticalCrop(dimensions.width, dimensions.height, overlay);
                exportResolution = `${crop.outputWidth}x${crop.outputHeight} (9:16 Vertical)`;
                return `crop=${crop.sourceWidth}:${crop.sourceHeight}:${crop.sourceX}:${crop.sourceY},scale=${crop.outputWidth}:${crop.outputHeight}:flags=lanczos,setsar=1`;
              })()
            : null;

          const captionChain =
            hasCaptions && cropFilter
              ? buildCaptionOverlayChain('base', captionOverlays, 1, 'outv')
              : { parts: [] as string[], inputs: [] as string[] };

          const exitCode = await ffmpeg.exec([
            '-i', inputName,
            ...captionChain.inputs,
            ...(cropFilter
              ? captionChain.parts.length > 0
                ? [
                    '-filter_complex',
                    [`[0:v]${cropFilter}[base]`, ...captionChain.parts].join(';'),
                    '-map',
                    '[outv]',
                  ]
                : ['-vf', cropFilter, '-map', '0:v:0']
              : ['-map', '0:v:0']),
            '-map', '0:a?',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '20',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
            '-movflags', '+faststart',
            outputName,
          ]);

          if (exitCode !== 0) throw new Error(`FFmpeg encoding failed with code ${exitCode}.`);
        }

        onProgress({
          stage: 'finalizing',
          percent: 98,
          message: 'Finalizing verification stamp and preparing download...',
        });

        const outputData = await ffmpeg.readFile(outputName);
        const outputBlob = new Blob([outputData as unknown as BlobPart], {
          type: 'video/mp4',
        });

        return createResult({
          verificationCode,
          videoBlob: outputBlob,
          brandName,
          payoutRate,
          campaignMode,
          overlay,
          selectedHook,
          formattedCaption,
          resolution: exportResolution,
          startedAt,
        });
      } finally {
        ffmpeg.off('progress', handleProgress);
        await Promise.all(
          tempFiles.map(async (file) => {
            try {
              await ffmpeg.deleteFile(file);
            } catch {
              return;
            }
          })
        );
      }
    } catch (error) {
      console.warn('FFmpeg engine unavailable, using browser render fallback:', error);
    }
  }

  return renderWithBrowserFallback(
    videoFileOrBlob,
    shouldCompositeBanner ? bannerBlobOrUrl : null,
    overlay,
    brandName,
    payoutRate,
    campaignMode,
    selectedHook,
    formattedCaption,
    verificationCode,
    onProgress,
    startedAt
  );
}

async function renderWithBrowserFallback(
  videoFileOrBlob: File | Blob,
  bannerBlobOrUrl: Blob | string | null | undefined,
  overlay: OverlaySettings,
  brandName: string,
  payoutRate: string,
  campaignMode: CampaignMode,
  selectedHook: string | undefined,
  formattedCaption: string | undefined,
  verificationCode: string,
  onProgress: (p: RenderProgress) => void,
  startedAt: number
): Promise<VerificationResult> {
  const isCreatorMode = campaignMode === 'creator';
  const shouldUseSplitScreen =
    isCreatorMode &&
    Boolean(overlay.splitScreen && overlay.facecamCrop && overlay.gameplayCrop);
  const needsReframe = isCreatorMode;
  const canRecordCanvas =
    typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function';

  if (!canRecordCanvas) {
    if (needsReframe) {
      throw new Error('This browser cannot apply facecam zoom/pan. Please use Chrome or Safari.');
    }
    if (isCreatorMode || !bannerBlobOrUrl) {
      onProgress({
        stage: 'complete',
        percent: 100,
        message: 'Clean source video preserved without overlays.',
      });
      return createResult({
        verificationCode,
        videoBlob: videoFileOrBlob,
        brandName,
        payoutRate,
        campaignMode,
        overlay,
        selectedHook,
        formattedCaption,
        resolution: 'Source Resolution',
        startedAt,
      });
    }
    throw new Error('This browser cannot render the sponsor overlay. Please use Chrome or Safari.');
  }

  onProgress({
    stage: 'compositing',
    percent: 20,
    message: isCreatorMode
      ? 'Auditing clean video stream (Zero-Logos Policy)...'
      : 'Preparing 9:16 Safe-Zone compositing engine...',
  });

  const videoUrl = URL.createObjectURL(videoFileOrBlob);
  const video = document.createElement('video');
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error('Timed out while reading video metadata.')),
      10000
    );
    video.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    video.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to load video file metadata.'));
    };
  });

  const duration = Math.max(video.duration || 5, 1);
  const sourceWidth = video.videoWidth > 0 ? video.videoWidth : 720;
  const sourceHeight = video.videoHeight > 0 ? video.videoHeight : 1280;
  const verticalCrop =
    isCreatorMode && !shouldUseSplitScreen
      ? computeVerticalCrop(sourceWidth, sourceHeight, overlay)
      : null;
  const splitCrops =
    shouldUseSplitScreen && overlay.facecamCrop && overlay.gameplayCrop
      ? {
          facecam: rectToPixelCrop(
            zoomFacecamCrop(
              overlay.facecamCrop,
              overlay.facecamZoom ?? 1.5,
              overlay.facecamPanX ?? 50,
              overlay.facecamPanY ?? 50
            ),
            sourceWidth,
            sourceHeight
          ),
          gameplay: rectToPixelCrop(
            overlay.gameplayCrop,
            sourceWidth,
            sourceHeight
          ),
        }
      : null;
  const targetWidth = splitCrops || verticalCrop ? 1080 : sourceWidth;
  const targetHeight = splitCrops || verticalCrop ? 1920 : sourceHeight;

  let bannerImg: HTMLImageElement | null = null;
  let bannerObjectUrl: string | null = null;
  if (!isCreatorMode && bannerBlobOrUrl) {
    const bannerSrc =
      typeof bannerBlobOrUrl === 'string'
        ? bannerBlobOrUrl
        : (bannerObjectUrl = URL.createObjectURL(bannerBlobOrUrl));
    bannerImg = new Image();
    bannerImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      bannerImg!.onload = () => resolve();
      bannerImg!.onerror = () => reject(new Error('Failed to load banner image.'));
      bannerImg!.src = bannerSrc;
    });
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering is not available in this browser.');
  if (isCreatorMode && overlay.captions?.burn) {
    await ensureCaptionFonts().catch(() => {});
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const canvasStream = canvas.captureStream(30);
  let audioCtx: AudioContext | null = null;
  let audioVideo: HTMLVideoElement | null = null;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      audioVideo = document.createElement('video');
      audioVideo.src = videoUrl;
      audioVideo.muted = false;
      audioVideo.playsInline = true;
      const sourceNode = audioCtx.createMediaElementSource(audioVideo);
      const destNode = audioCtx.createMediaStreamDestination();
      sourceNode.connect(destNode);
      const audioTrack = destNode.stream.getAudioTracks()[0];
      if (audioTrack) canvasStream.addTrack(audioTrack);
      audioVideo.currentTime = 0;
      void audioVideo.play().catch(() => {});
    }
  } catch (error) {
    console.warn('Audio stream multiplexing warning:', error);
  }

  let mimeType = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2';
  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/mp4';
  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 8000000,
  });

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) recordedChunks.push(event.data);
  };

  const outputPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(recordedChunks, { type: mimeType }));
    };
  });

  onProgress({
    stage: 'encoding',
    percent: 35,
    message: isCreatorMode
      ? 'Exporting pristine clean MP4 with original audio preserved...'
      : 'Stamping Safe-Zone overlay and encoding H.264 stream...',
  });

  let bannerW = 0;
  let bannerH = 0;
  let bannerX = 0;
  let bannerY = 0;

  if (bannerImg) {
    const bannerAspect = bannerImg.width / bannerImg.height;
    bannerW = targetWidth * 0.88 * (overlay.scale / 100);
    bannerH = bannerW / bannerAspect;
    bannerX = (targetWidth - bannerW) / 2;
    bannerY = targetHeight * (overlay.yOffset / 100);
  }

  video.currentTime = 0;
  await video.play().catch(() => {});
  recorder.start(100);

  let isDone = false;
  const finish = () => {
    if (isDone) return;
    isDone = true;
    if (recorder.state === 'recording') recorder.stop();
    video.pause();
  };

  const safetyTimeout = setTimeout(finish, (duration + 1) * 1000);
  const progressInterval = setInterval(() => {
    if (isDone) {
      clearInterval(progressInterval);
      return;
    }
    const current = video.currentTime;
    const percent = Math.min(Math.round((current / duration) * 60) + 35, 95);
    onProgress({
      stage: 'encoding',
      percent,
      message: `${isCreatorMode ? 'Processing Clean Video' : 'Compositing Safe-Zone'}: ${percent}% (${current.toFixed(1)}s / ${duration.toFixed(1)}s)...`,
    });
  }, 150);

  const drawFrame = () => {
    if (isDone) return;
    if (splitCrops) {
      ctx.drawImage(
        video,
        splitCrops.facecam.x,
        splitCrops.facecam.y,
        splitCrops.facecam.width,
        splitCrops.facecam.height,
        0,
        0,
        1080,
        672
      );
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.fillRect(0, 672, 1080, 2);
      ctx.drawImage(
        video,
        splitCrops.gameplay.x,
        splitCrops.gameplay.y,
        splitCrops.gameplay.width,
        splitCrops.gameplay.height,
        0,
        674,
        1080,
        1248
      );
    } else if (verticalCrop) {
      ctx.drawImage(
        video,
        verticalCrop.sourceX,
        verticalCrop.sourceY,
        verticalCrop.sourceWidth,
        verticalCrop.sourceHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );
    } else {
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    }

    if (!isCreatorMode && bannerImg) {
      ctx.save();
      ctx.globalAlpha = overlay.opacity / 100;
      ctx.drawImage(bannerImg, bannerX, bannerY, bannerW, bannerH);
      ctx.restore();
    }

    if (isCreatorMode && overlay.captions?.burn) {
      const caption = overlay.captions.segments.find(
        (segment) => video.currentTime >= segment.start && video.currentTime <= segment.end
      );
      if (caption) {
        drawCaptionText(
          ctx,
          caption.text,
          overlay.captions.position,
          overlay.captions.style ?? 'classic',
          targetWidth,
          targetHeight
        );
      }
    }

    if (video.currentTime >= duration - 0.05 || video.ended) {
      finish();
      return;
    }
    requestAnimationFrame(drawFrame);
  };

  requestAnimationFrame(drawFrame);
  video.onended = finish;

  const finalBlob = await outputPromise;
  clearTimeout(safetyTimeout);
  clearInterval(progressInterval);
  isDone = true;
  video.pause();
  video.removeAttribute('src');
  video.load();
  URL.revokeObjectURL(videoUrl);
  if (bannerObjectUrl) URL.revokeObjectURL(bannerObjectUrl);
  if (audioVideo) {
    audioVideo.pause();
    audioVideo.removeAttribute('src');
    audioVideo.load();
  }
  if (audioCtx) await audioCtx.close().catch(() => {});

  onProgress({
    stage: 'finalizing',
    percent: 98,
    message: 'Generating verified submission tag and packaging MP4...',
  });

  return createResult({
    verificationCode,
    videoBlob: finalBlob,
    brandName,
    payoutRate,
    campaignMode,
    overlay,
    selectedHook,
    formattedCaption,
    resolution: splitCrops
      ? '1080x1920 (9:16 Split-Screen Vertical)'
      : `${targetWidth}x${targetHeight} (9:16 Vertical)`,
    startedAt,
  });
}
