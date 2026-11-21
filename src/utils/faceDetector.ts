import { FacecamCorner, SourceRect } from '@/types';

export interface FacecamDetectionResult {
  sourceWidth: number;
  sourceHeight: number;
  sourceAspect: number;
  facecamCrop: SourceRect;
  gameplayCrop: SourceRect;
  frameUrl: string;
  method: 'native-face-detector' | 'corner-fallback' | 'top-right-default';
  detectedFaces: number;
  scannedAt: number[];
  suggestedFacecamZoom: number;
}

interface NormalizedBox extends SourceRect {}

interface NativeFaceDetectorResult {
  boundingBox: DOMRectReadOnly;
  confidence?: number;
}

interface NativeFaceDetector {
  detect(source: CanvasImageSource): Promise<NativeFaceDetectorResult[]>;
}

type NativeFaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => NativeFaceDetector;

export const SPLIT_TOP_PANEL_ASPECT = 1080 / 672;
export const SPLIT_BOTTOM_PANEL_ASPECT = 1080 / 1248;

const TOP_PANEL_ASPECT = SPLIT_TOP_PANEL_ASPECT;
const BOTTOM_PANEL_ASPECT = SPLIT_BOTTOM_PANEL_ASPECT;
const SCAN_TIMES = [2, 5];
const TOP_RIGHT_FACE_BOX: NormalizedBox = {
  x: 0.72,
  y: 0.04,
  width: 0.25,
  height: 0.28,
};
const CORNER_REGIONS: NormalizedBox[] = [
  { x: 0, y: 0, width: 0.3, height: 0.32 },
  { x: 0.7, y: 0, width: 0.3, height: 0.32 },
  { x: 0, y: 0.68, width: 0.3, height: 0.32 },
  { x: 0.7, y: 0.68, width: 0.3, height: 0.32 },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const clampRect = (rect: SourceRect): SourceRect => {
  const width = clamp(rect.width, 0.08, 1);
  const height = clamp(rect.height, 0.08, 1);
  return {
    x: clamp(rect.x, 0, 1 - width),
    y: clamp(rect.y, 0, 1 - height),
    width,
    height,
  };
};

const waitForMetadata = (video: HTMLVideoElement, url: string) =>
  new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error('Timed out while loading video metadata.')),
      10000
    );
    video.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    video.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Could not read the uploaded video.'));
    };
    video.src = url;
    video.load();
  });

const seekTo = (video: HTMLVideoElement, time: number) =>
  new Promise<void>((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve();
      return;
    }
    const timeoutId = setTimeout(
      () => reject(new Error(`Timed out seeking to ${time}s.`)),
      8000
    );
    video.onseeked = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    video.currentTime = time;
  });

const getNativeDetector = (): NativeFaceDetector | null => {
  if (typeof window === 'undefined') return null;
  const constructor = (window as Window & { FaceDetector?: NativeFaceDetectorConstructor })
    .FaceDetector;
  if (!constructor) return null;

  try {
    return new constructor({ fastMode: true, maxDetectedFaces: 4 });
  } catch {
    return null;
  }
};

const detectNativeBoxes = async (
  detector: NativeFaceDetector | null,
  canvas: HTMLCanvasElement,
  minConfidence = 0.2
): Promise<NormalizedBox[]> => {
  if (!detector) return [];

  try {
    const detected = await detector.detect(canvas);
    return detected
      .filter((item) => item.confidence === undefined || item.confidence >= minConfidence)
      .map((item) => ({
        x: item.boundingBox.x / canvas.width,
        y: item.boundingBox.y / canvas.height,
        width: item.boundingBox.width / canvas.width,
        height: item.boundingBox.height / canvas.height,
      }))
      .filter(
        (box) =>
          box.width > 0.04 && box.height > 0.06 && box.x >= 0 && box.y >= 0
      );
  } catch {
    return [];
  }
};

const scoreCornerRegion = (
  ctx: CanvasRenderingContext2D,
  box: NormalizedBox,
  canvasWidth: number,
  canvasHeight: number
): number => {
  const x = Math.max(0, Math.floor(box.x * canvasWidth));
  const y = Math.max(0, Math.floor(box.y * canvasHeight));
  const width = Math.max(1, Math.floor(box.width * canvasWidth));
  const height = Math.max(1, Math.floor(box.height * canvasHeight));

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(x, y, width, height).data;
  } catch {
    return -1;
  }

  let skinCount = 0;
  let luminanceSum = 0;
  let luminanceSquareSum = 0;
  const total = data.length / 4;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);

    if (
      red > 85 &&
      green > 35 &&
      blue > 15 &&
      max - min > 12 &&
      (red > green || red > blue)
    ) {
      skinCount += 1;
    }

    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    luminanceSum += luminance;
    luminanceSquareSum += luminance * luminance;
  }

  const mean = luminanceSum / total;
  const variance = Math.max(0, luminanceSquareSum / total - mean * mean);
  return (skinCount / total) * 2.2 + Math.min(variance / 4000, 0.8);
};

const mapCornerBox = (box: NormalizedBox, region: NormalizedBox): NormalizedBox => {
  const x = clamp(region.x + box.x * region.width, 0, 1);
  const y = clamp(region.y + box.y * region.height, 0, 1);
  return {
    x,
    y,
    width: clamp(box.width * region.width, 0.02, 1 - x),
    height: clamp(box.height * region.height, 0.02, 1 - y),
  };
};

const detectNativeCornerBoxes = async (
  detector: NativeFaceDetector | null,
  sourceCanvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): Promise<{ box: NormalizedBox; score: number }[]> => {
  if (!detector) return [];

  const cornerCanvas = document.createElement('canvas');
  const cornerCtx = cornerCanvas.getContext('2d', { willReadFrequently: true });
  if (!cornerCtx) return [];

  const detectedFaces: { box: NormalizedBox; score: number }[] = [];

  for (const region of CORNER_REGIONS) {
    const x = Math.floor(region.x * sourceCanvas.width);
    const y = Math.floor(region.y * sourceCanvas.height);
    const width = Math.max(2, Math.floor(region.width * sourceCanvas.width));
    const height = Math.max(2, Math.floor(region.height * sourceCanvas.height));
    cornerCanvas.width = width;
    cornerCanvas.height = height;
    cornerCtx.drawImage(sourceCanvas, x, y, width, height, 0, 0, width, height);

    const boxes = await detectNativeBoxes(detector, cornerCanvas);
    for (const box of boxes) {
      const mapped = mapCornerBox(box, region);
      const score = scoreCornerRegion(ctx, mapped, sourceCanvas.width, sourceCanvas.height);
      if (score >= 0.2) detectedFaces.push({ box: mapped, score });
    }
  }

  return detectedFaces.sort((a, b) => b.score - a.score);
};

const detectCornerFallback = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): NormalizedBox | null => {
  const scored = CORNER_REGIONS.map((candidate) => ({
    candidate,
    score: scoreCornerRegion(ctx, candidate, canvasWidth, canvasHeight),
  })).sort((a, b) => b.score - a.score);

  if (!scored[0] || scored[0].score <= 0.35) {
    return null;
  }

  return scored[0].candidate;
};

export const buildFacecamCrop = (
  faceBox: NormalizedBox,
  sourceAspect: number
): SourceRect => {
  const paddedFaceWidth = faceBox.width * 1.5;
  const paddedFaceHeight = faceBox.height * 2.2;

  let height = clamp(paddedFaceHeight, 0.2, 0.92);
  let width = (height * TOP_PANEL_ASPECT) / sourceAspect;

  if (width < paddedFaceWidth || width > 0.94) {
    width = clamp(paddedFaceWidth, 0.2, 0.94);
    height = (width * sourceAspect) / TOP_PANEL_ASPECT;
  }

  height = clamp(height, 0.2, 0.94);

  const centerX = faceBox.x + faceBox.width / 2;
  const centerY = faceBox.y + faceBox.height / 2;

  return clampRect({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  });
};

export const buildGameplayCrop = (sourceAspect: number): SourceRect => {
  let width = 0.96;
  let height = (width * sourceAspect) / BOTTOM_PANEL_ASPECT;

  if (height > 0.96) {
    height = 0.96;
    width = (height * BOTTOM_PANEL_ASPECT) / sourceAspect;
  }

  return clampRect({
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  });
};

export const snapFacecamCrop = (
  crop: SourceRect,
  corner: FacecamCorner,
  inset = 0.025
): SourceRect => {
  const x = corner.endsWith('right') ? 1 - inset - crop.width : inset;
  const y = corner.startsWith('bottom') ? 1 - inset - crop.height : inset;
  return clampRect({ ...crop, x, y });
};

export const computeFacecamZoom = (
  crop: SourceRect,
  sourceAspect: number,
  panelAspect: number = SPLIT_TOP_PANEL_ASPECT
): number => {
  const visibleWidth = sourceAspect >= panelAspect ? panelAspect / sourceAspect : 1;
  const visibleHeight = sourceAspect >= panelAspect ? 1 : sourceAspect / panelAspect;
  const required = Math.max(visibleWidth / crop.width, visibleHeight / crop.height);
  return clamp(required, 1, 4);
};

export const zoomFacecamCrop = (
  crop: SourceRect,
  zoom: number,
  panX: number,
  panY: number
): SourceRect => {
  const zoomFactor = clamp(zoom, 1, 4);
  const width = crop.width / zoomFactor;
  const height = crop.height / zoomFactor;
  const centerX = crop.x + crop.width / 2 + ((clamp(panX, 0, 100) - 50) / 50) * crop.width * 0.35;
  const centerY = crop.y + crop.height / 2 + ((clamp(panY, 0, 100) - 50) / 50) * crop.height * 0.35;
  return clampRect({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  });
};

export const unzoomFacecamCrop = (
  crop: SourceRect,
  zoom: number,
  panX: number,
  panY: number
): SourceRect => {
  const zoomFactor = clamp(zoom, 1, 4);
  const width = crop.width * zoomFactor;
  const height = crop.height * zoomFactor;
  const panFactorX = ((clamp(panX, 0, 100) - 50) / 50) * 0.35;
  const panFactorY = ((clamp(panY, 0, 100) - 50) / 50) * 0.35;
  const centerX = crop.x + crop.width / 2 - panFactorX * width;
  const centerY = crop.y + crop.height / 2 - panFactorY * height;
  return clampRect({
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  });
};

export const rectToPixelCrop = (
  rect: SourceRect,
  sourceWidth: number,
  sourceHeight: number
): { width: number; height: number; x: number; y: number } => {
  const even = (value: number) => Math.max(2, Math.round(value / 2) * 2);
  const evenFloor = (value: number) => Math.max(2, Math.floor(value / 2) * 2);
  const width = Math.min(even(rect.width * sourceWidth), evenFloor(sourceWidth));
  const height = Math.min(even(rect.height * sourceHeight), evenFloor(sourceHeight));
  const x = clamp(even(rect.x * sourceWidth), 0, evenFloor(sourceWidth - width));
  const y = clamp(even(rect.y * sourceHeight), 0, evenFloor(sourceHeight - height));
  return { width, height, x, y };
};

export const detectFacecamFromVideo = async (
  blob: Blob
): Promise<FacecamDetectionResult> => {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;

  try {
    await waitForMetadata(video, url);

    const sourceWidth = video.videoWidth || 1920;
    const sourceHeight = video.videoHeight || 1080;
    const sourceAspect = sourceWidth / sourceHeight;
    const canvas = document.createElement('canvas');
    const previewScale = Math.min(1, 480 / sourceWidth);
    canvas.width = Math.max(2, Math.round(sourceWidth * previewScale));
    canvas.height = Math.max(2, Math.round(sourceHeight * previewScale));

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas rendering is not available for facecam detection.');

    const detector = getNativeDetector();
    const duration = Number.isFinite(video.duration) ? video.duration : 6;
    const scanTimes = SCAN_TIMES.filter((time) => time < Math.max(duration - 0.1, 0.2));
    if (scanTimes.length === 0) scanTimes.push(Math.min(0.1, Math.max(duration - 0.05, 0)));

    const detectedFaces: { box: NormalizedBox; score: number }[] = [];
    let frameUrl = '';

    for (const time of scanTimes) {
      await seekTo(video, time);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (!frameUrl) frameUrl = canvas.toDataURL('image/jpeg', 0.78);
      detectedFaces.push(...(await detectNativeCornerBoxes(detector, canvas, ctx)));
    }

    detectedFaces.sort((a, b) => b.score - a.score);

    let method: FacecamDetectionResult['method'] = detector
      ? 'native-face-detector'
      : 'corner-fallback';
    let faceBox: NormalizedBox | undefined = detectedFaces[0]?.box;
    if (!faceBox) {
      method = 'corner-fallback';
      faceBox = detectCornerFallback(ctx, canvas.width, canvas.height) ?? undefined;
    }
    let facecamCrop: SourceRect;
    let usedDefault = false;

    if (faceBox) {
      facecamCrop = buildFacecamCrop(faceBox, sourceAspect);
    } else {
      usedDefault = true;
      method = 'top-right-default';
      faceBox = TOP_RIGHT_FACE_BOX;
      facecamCrop = { ...TOP_RIGHT_FACE_BOX };
    }

    return {
      sourceWidth,
      sourceHeight,
      sourceAspect,
      facecamCrop,
      gameplayCrop: buildGameplayCrop(sourceAspect),
      frameUrl,
      method,
      detectedFaces: detectedFaces.length,
      scannedAt: scanTimes,
      suggestedFacecamZoom: usedDefault ? 1 : computeFacecamZoom(facecamCrop, sourceAspect),
    };
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
};
