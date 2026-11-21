'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  Layers,
  Zap,
  Ban,
} from 'lucide-react';
import {
  CampaignConfig,
  FacecamCorner,
  OverlaySettings,
  PlatformOverlay,
  SourceRect,
} from '@/types';
import {
  YouTubeShortsOverlay,
  InstagramReelsOverlay,
  TikTokOverlay,
  SafeZoneGuidesOverlay,
  CreatorFacecamGuide,
} from './PlatformOverlays';
import { getCreatorHandle, injectCreatorName } from '@/data/presets';
import {
  detectFacecamFromVideo,
  snapFacecamCrop,
  zoomFacecamCrop,
  unzoomFacecamCrop,
  FacecamDetectionResult,
  SPLIT_BOTTOM_PANEL_ASPECT,
  SPLIT_TOP_PANEL_ASPECT,
} from '@/utils/faceDetector';
import { createSampleVideoBlob } from '@/utils/assetHelper';
import { AudioPeak, detectTopAudioPeaks } from '@/utils/audioAnalyzer';
import { CaptionEditor } from './CaptionEditor';

interface StudioCanvasProps {
  campaign: CampaignConfig;
  overlaySettings: OverlaySettings;
  setOverlaySettings: React.Dispatch<React.SetStateAction<OverlaySettings>>;
  onStartExport: (videoFile: File | Blob) => void;
  externalSeekTime?: number | null;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  campaign,
  overlaySettings,
  setOverlaySettings,
  onStartExport,
  externalSeekTime,
}) => {
  // Video state starts empty
  const [videoFile, setVideoFile] = useState<File | Blob | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isLoadingSample, setIsLoadingSample] = useState<boolean>(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<FacecamDetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);
  const [audioPeaks, setAudioPeaks] = useState<AudioPeak[]>([]);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState<boolean>(false);
  const [audioPeaksError, setAudioPeaksError] = useState<string | null>(null);

  // Overlay preview toggles (Default YouTube Shorts)
  const [activePlatform, setActivePlatform] = useState<PlatformOverlay>('youtube');
  const [showSafeZoneGrid, setShowSafeZoneGrid] = useState<boolean>(false);
  const [showFacecamGuide, setShowFacecamGuide] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const splitVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const audioAnalysisTokenRef = useRef(0);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropEditorRef = useRef<HTMLDivElement | null>(null);
  const cropDragRef = useRef<{
    mode: 'move' | 'resize';
    startX: number;
    startY: number;
    rect: SourceRect;
  } | null>(null);

  const isCreatorMode = campaign.campaignMode === 'creator';
  const creatorNameText = injectCreatorName('[Creator Name]', campaign);
  const creatorHandle = getCreatorHandle(campaign);
  const sourceAspect = overlaySettings.sourceAspect ?? 1;
  const isHorizontalSource = sourceAspect > 1;
  const splitScreenActive = isCreatorMode && Boolean(overlaySettings.splitScreen);

  const clampValue = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const facecamZoom = clampValue(overlaySettings.facecamZoom ?? 1.5, 1, 4);
  const facecamPanX = clampValue(overlaySettings.facecamPanX ?? 50, 0, 100);
  const facecamPanY = clampValue(overlaySettings.facecamPanY ?? 50, 0, 100);

  const getCropVideoStyle = (crop: SourceRect | undefined, panelAspect: number) => {
    if (!crop) return { objectPosition: '50% 50%', transform: 'scale(1)' };
    const visibleWidth = sourceAspect >= panelAspect ? panelAspect / sourceAspect : 1;
    const visibleHeight = sourceAspect >= panelAspect ? 1 : sourceAspect / panelAspect;
    const centerX = crop.x + crop.width / 2;
    const centerY = crop.y + crop.height / 2;
    const positionX =
      visibleWidth >= 1 ? 50 : ((centerX - visibleWidth / 2) / (1 - visibleWidth)) * 100;
    const positionY =
      visibleHeight >= 1 ? 50 : ((centerY - visibleHeight / 2) / (1 - visibleHeight)) * 100;
    const scale = Math.max(
      visibleWidth / Math.max(crop.width, 0.02),
      visibleHeight / Math.max(crop.height, 0.02)
    );
    return {
      objectPosition: `${clampValue(positionX, 0, 100)}% ${clampValue(positionY, 0, 100)}%`,
      transform: `scale(${scale})`,
    };
  };

  const effectiveFacecamCrop = overlaySettings.facecamCrop
    ? zoomFacecamCrop(overlaySettings.facecamCrop, facecamZoom, facecamPanX, facecamPanY)
    : undefined;
  const facecamVideoStyle = getCropVideoStyle(
    effectiveFacecamCrop,
    SPLIT_TOP_PANEL_ASPECT
  );
  const gameplayVideoStyle = getCropVideoStyle(
    overlaySettings.gameplayCrop,
    SPLIT_BOTTOM_PANEL_ASPECT
  );

  const syncSplitVideo = () => {
    const primary = videoRef.current;
    const secondary = splitVideoRef.current;
    if (!primary || !secondary) return;
    if (Math.abs(primary.currentTime - secondary.currentTime) > 0.08) {
      secondary.currentTime = primary.currentTime;
    }
    if (primary.paused && !secondary.paused) {
      secondary.pause();
    } else if (!primary.paused && secondary.paused) {
      void secondary.play().catch(() => {});
    }
  };

  const applySeek = (seconds: number) => {
    const video = videoRef.current;
    if (!video) {
      pendingSeekRef.current = seconds;
      return;
    }
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      pendingSeekRef.current = seconds;
      return;
    }
    const boundedSeek = Math.min(Math.max(seconds, 0), Math.max(video.duration - 0.05, 0));
    video.currentTime = boundedSeek;
    setCurrentTime(boundedSeek);
    requestAnimationFrame(syncSplitVideo);
  };

  useEffect(() => {
    if (externalSeekTime !== undefined && externalSeekTime !== null) {
      applySeek(externalSeekTime);
    }
  }, [externalSeekTime]);

  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
  }, [videoSrc]);

  useEffect(() => {
    const canvas = sourceCanvasRef.current;
    if (!canvas || !videoSrc || !isCreatorMode) return;

    let animationFrame = 0;
    const draw = () => {
      const video = [videoRef.current, splitVideoRef.current].find(
        (candidate) =>
          candidate && candidate.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      );
      const ctx = canvas.getContext('2d');
      if (video && video.videoWidth > 0 && video.videoHeight > 0 && ctx) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, [videoSrc, isCreatorMode]);

  // Sync default position when campaign changes
  useEffect(() => {
    setOverlaySettings((prev) => {
      const clampedY = Math.min(
        Math.max(campaign.defaultYOffset, campaign.minYOffset),
        campaign.maxYOffset
      );
      return {
        ...prev,
        yOffset: clampedY,
        scale: campaign.defaultScale,
        opacity: campaign.defaultOpacity,
        splitScreen: campaign.campaignMode === 'creator' ? prev.splitScreen : false,
      };
    });
  }, [campaign, setOverlaySettings]);

  const analyzeAudioForPeaks = async (blob: Blob) => {
    const token = audioAnalysisTokenRef.current + 1;
    audioAnalysisTokenRef.current = token;
    setAudioPeaks([]);
    setAudioPeaksError(null);
    setIsAnalyzingAudio(true);

    try {
      const peaks = await detectTopAudioPeaks(blob);
      if (token === audioAnalysisTokenRef.current) setAudioPeaks(peaks);
    } catch (error) {
      if (token === audioAnalysisTokenRef.current) {
        setAudioPeaksError(
          error instanceof Error ? error.message : 'Audio peak analysis failed.'
        );
      }
    } finally {
      if (token === audioAnalysisTokenRef.current) setIsAnalyzingAudio(false);
    }
  };

  const runFacecamDetection = async (blob: Blob) => {
    if (!isCreatorMode) return;

    setIsDetecting(true);
    setDetectionError(null);

    try {
      const result = await detectFacecamFromVideo(blob);
      setDetectionResult(result);
      setOverlaySettings((prev) => ({
        ...prev,
        sourceAspect: result.sourceAspect,
        facecamCrop: result.facecamCrop,
        gameplayCrop: result.gameplayCrop,
        facecamZoom: result.suggestedFacecamZoom,
        facecamPanX: 50,
        facecamPanY: 50,
        xOffset: Math.round(
          clampValue(
            (result.facecamCrop.x + result.facecamCrop.width / 2) * 100,
            15,
            85
          )
        ),
        splitScreen: result.sourceAspect > 1 ? true : (prev.splitScreen ?? false),
      }));
    } catch (err) {
      setDetectionError(
        err instanceof Error ? err.message : 'Facecam detection failed for this video.'
      );
    } finally {
      setIsDetecting(false);
    }
  };

  // Handle Video file selection
  const handleFile = (file: File) => {
    const isVideo =
      file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(file.name);
    if (!isVideo) {
      setSampleError('Please upload a valid MP4 or MOV vertical video file.');
      return;
    }
    setSampleError(null);
    setVideoFile(file);
    setVideoSrc(URL.createObjectURL(file));
    setIsPlaying(false);
    setIsMuted(false);
    setCurrentTime(0);
    setDuration(0);
    pendingSeekRef.current = null;
    setDetectionResult(null);
    setOverlaySettings((prev) => ({
      ...prev,
      captions: {
        burn: false,
        position: prev.captions?.position ?? 'center',
        style: prev.captions?.style ?? 'classic',
        segments: [],
      },
    }));
    void runFacecamDetection(file);
    void analyzeAudioForPeaks(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Discreet Sample Loader
  const handleLoadSample = async () => {
    try {
      setIsLoadingSample(true);
      setSampleError(null);
      const sample = await createSampleVideoBlob();
      setVideoFile(sample.blob);
      setVideoSrc(sample.url);
      setDuration(sample.duration || 4.0);
      setIsPlaying(false);
      setIsMuted(false);
      setCurrentTime(0);
      pendingSeekRef.current = null;
      setDetectionResult(null);
      setOverlaySettings((prev) => ({
        ...prev,
        captions: {
          burn: false,
          position: prev.captions?.position ?? 'center',
          style: prev.captions?.style ?? 'classic',
          segments: [],
        },
      }));
      void runFacecamDetection(sample.blob);
      void analyzeAudioForPeaks(sample.blob);
    } catch (err) {
      console.error('Error generating sample:', err);
      setSampleError(
        err instanceof Error
          ? err.message
          : 'Could not generate the demo clip. Please upload a video instead.'
      );
    } finally {
      setIsLoadingSample(false);
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        if (splitScreenActive && splitVideoRef.current) {
          await splitVideoRef.current.play().catch(() => {});
        }
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
      splitVideoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const ct = videoRef.current.currentTime;
    setCurrentTime(isFinite(ct) ? ct : 0);
    syncSplitVideo();
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    let dur = videoRef.current.duration;
    if (!isFinite(dur) || isNaN(dur) || dur <= 0) {
      dur = 4.0;
    }
    setDuration(dur);
    if (pendingSeekRef.current !== null) {
      applySeek(pendingSeekRef.current);
      pendingSeekRef.current = null;
    }
    requestAnimationFrame(syncSplitVideo);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (videoRef.current && isFinite(val)) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
      requestAnimationFrame(syncSplitVideo);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Slider adjustments clamped within brand limits
  const handleYChange = (newVal: number) => {
    const clamped = Math.min(Math.max(newVal, campaign.minYOffset), campaign.maxYOffset);
    setOverlaySettings((prev) => ({ ...prev, yOffset: clamped }));
  };

  const handleScaleChange = (newVal: number) => {
    const clamped = Math.min(Math.max(newVal, campaign.minScale), campaign.maxScale);
    setOverlaySettings((prev) => ({ ...prev, scale: clamped }));
  };

  const handleOpacityChange = (newVal: number) => {
    const clamped = Math.min(Math.max(newVal, campaign.minOpacity), campaign.maxOpacity);
    setOverlaySettings((prev) => ({ ...prev, opacity: clamped }));
  };

  const handleZoomChange = (newVal: number) => {
    const clamped = Math.min(Math.max(newVal, 100), 250);
    setOverlaySettings((prev) => ({ ...prev, zoom: clamped }));
  };

  const handleXOffsetChange = (newVal: number) => {
    const clamped = Math.min(Math.max(newVal, 0), 100);
    setOverlaySettings((prev) => ({ ...prev, xOffset: clamped }));
  };

  const updateFacecamCrop = (crop: SourceRect) => {
    setOverlaySettings((prev) => ({ ...prev, facecamCrop: crop }));
  };

  const handleCropPointerDown = (
    event: React.PointerEvent,
    mode: 'move' | 'resize'
  ) => {
    if (!effectiveFacecamCrop) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    cropDragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect: { ...effectiveFacecamCrop },
    };
  };

  const handleCropPointerMove = (event: React.PointerEvent) => {
    const drag = cropDragRef.current;
    const bounds = cropEditorRef.current?.getBoundingClientRect();
    if (!drag || !bounds) return;

    const deltaX = (event.clientX - drag.startX) / bounds.width;
    const deltaY = (event.clientY - drag.startY) / bounds.height;

    if (drag.mode === 'move') {
      updateFacecamCrop(
        unzoomFacecamCrop(
          {
            ...drag.rect,
            x: clampValue(drag.rect.x + deltaX, 0, 1 - drag.rect.width),
            y: clampValue(drag.rect.y + deltaY, 0, 1 - drag.rect.height),
          },
          facecamZoom,
          facecamPanX,
          facecamPanY
        )
      );
      return;
    }

    updateFacecamCrop(
      unzoomFacecamCrop(
        {
          ...drag.rect,
          width: clampValue(drag.rect.width + deltaX, 0.04, 1 - drag.rect.x),
          height: clampValue(drag.rect.height + deltaY, 0.04, 1 - drag.rect.y),
        },
        facecamZoom,
        facecamPanX,
        facecamPanY
      )
    );
  };

  const handleCropPointerUp = () => {
    cropDragRef.current = null;
  };

  const handleCornerSnap = (corner: FacecamCorner) => {
    if (!overlaySettings.facecamCrop) return;
    const snapped = snapFacecamCrop(overlaySettings.facecamCrop, corner);
    setOverlaySettings((prev) => ({
      ...prev,
      facecamCrop: snapped,
      facecamPanX: 50,
      facecamPanY: 50,
    }));
  };

  const resetToBrandDefault = () => {
    setOverlaySettings({
      yOffset: campaign.defaultYOffset,
      scale: campaign.defaultScale,
      opacity: campaign.defaultOpacity,
      xOffset: 50,
      zoom: 100,
    });
  };

  const isWithinSafeBounds =
    overlaySettings.yOffset >= campaign.minYOffset &&
    overlaySettings.yOffset <= campaign.maxYOffset;

  const activeCaption =
    isCreatorMode && overlaySettings.captions?.burn
      ? overlaySettings.captions.segments.find(
          (segment) => currentTime >= segment.start && currentTime <= segment.end
        )
      : undefined;
  const captionStyle = overlaySettings.captions?.style ?? 'classic';
  const isViralCaption = captionStyle === 'viral';
  const captionPositionClass =
    overlaySettings.captions?.position === 'upper'
      ? 'top-[22%]'
      : overlaySettings.captions?.position === 'lower'
        ? 'top-[68%]'
        : 'top-[58%]';

  return (
    <div id="studio-canvas" className="scroll-mt-16 space-y-4">
      {/* Studio Section Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: campaign.accentColor }}
          />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            9:16 Video Studio &amp; Platform Safe Zones
          </h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isCreatorMode ? (
            <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-950 text-purple-200 border border-purple-600/80 flex items-center gap-1.5 shadow-lg shadow-purple-950/30 text-center">
              <Ban className="w-3.5 h-3.5 flex-shrink-0 text-purple-300" />
              Creator-Primary Policy: Zero External Logos Permitted
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              SPONSOR OVERLAY ACTIVE
            </span>
          )}
          <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
            1080×1920 Vertical
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT: 9:16 Interactive Canvas Studio (Aspect 9:16) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          {/* Canvas Top Controls Toolbar with Shorts, Reels, and TikTok */}
          <div className="w-full max-w-[360px] sm:max-w-[380px] mb-2.5 flex items-center justify-between gap-1.5">
            {/* Platform Mockup Toggle Buttons */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() =>
                  setActivePlatform(activePlatform === 'youtube' ? 'none' : 'youtube')
                }
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                  activePlatform === 'youtube'
                    ? 'bg-red-950/80 text-red-400 border border-red-800/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle YouTube Shorts UI Mockup"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Shorts</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActivePlatform(activePlatform === 'instagram' ? 'none' : 'instagram')
                }
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                  activePlatform === 'instagram'
                    ? 'bg-pink-950/80 text-pink-400 border border-pink-800/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle Instagram Reels UI Mockup"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                <span>Reels</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActivePlatform(activePlatform === 'tiktok' ? 'none' : 'tiktok')
                }
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                  activePlatform === 'tiktok'
                    ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Toggle TikTok UI Mockup"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>TikTok</span>
              </button>
            </div>

            {/* Safe Zone Grid Toggle */}
            <button
              type="button"
              onClick={() => setShowSafeZoneGrid(!showSafeZoneGrid)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                showSafeZoneGrid
                  ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Toggle Safe Zone Grid & Dead-Zone Heatmap"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Dead Zones</span>
            </button>

            {/* Creator Facecam Safe-Zone Guide Toggle */}
            {isCreatorMode && (
              <button
                type="button"
                onClick={() => setShowFacecamGuide(!showFacecamGuide)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                  showFacecamGuide
                    ? 'bg-purple-950/80 border-purple-700/80 text-purple-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title="Creator Facecam Safe-Zone Guide"
              >
                <Ban className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Facecam Guide</span>
                <span className="sm:hidden">Facecam</span>
              </button>
            )}
          </div>

          {/* 9:16 Canvas Phone Frame */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className={`relative w-full max-w-[340px] sm:max-w-[360px] aspect-[9/16] bg-zinc-950 rounded-[32px] overflow-hidden border-2 transition-all shadow-2xl flex flex-col justify-between ${
              isDraggingOver
                ? 'border-emerald-500 ring-4 ring-emerald-500/25 bg-emerald-950/10'
                : 'border-zinc-800 shadow-zinc-950/80'
            }`}
          >
            {/* Phone notch/speaker pill */}
            <div className="absolute top-2.5 inset-x-0 mx-auto w-24 h-4 bg-black/60 rounded-full z-30 pointer-events-none flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800 mr-2" />
              <div className="w-10 h-1 bg-zinc-800 rounded-full" />
            </div>

            {/* Video or Upload Dropzone */}
            {videoSrc ? (
              <>
                {splitScreenActive &&
                overlaySettings.facecamCrop &&
                overlaySettings.gameplayCrop ? (
                  <>
                    <div className="absolute inset-x-0 top-0 h-[35%] overflow-hidden z-0">
                      <video
                        ref={splitVideoRef}
                        src={videoSrc}
                        loop
                        playsInline
                        muted
                        onLoadedMetadata={syncSplitVideo}
                        onClick={togglePlay}
                        style={facecamVideoStyle}
                        className="w-full h-full object-cover cursor-pointer origin-center"
                      />
                    </div>
                    <div className="absolute inset-x-0 top-[35%] h-[2px] bg-white/70 z-20 shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                    <div className="absolute inset-x-0 top-[35%] bottom-0 overflow-hidden z-0">
                      <video
                        ref={videoRef}
                        src={videoSrc}
                        loop
                        playsInline
                        muted={isMuted}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onClick={togglePlay}
                        style={gameplayVideoStyle}
                        className="w-full h-full object-cover cursor-pointer origin-center"
                      />
                    </div>
                  </>
                ) : (
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    loop
                    playsInline
                    muted={isMuted}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onClick={togglePlay}
                    style={{
                      objectPosition: `${overlaySettings.xOffset}% 50%`,
                      transform: `scale(${(overlaySettings.zoom ?? 100) / 100})`,
                    }}
                    className="absolute inset-0 w-full h-full object-cover cursor-pointer z-0 origin-center"
                  />
                )}

                {!isCreatorMode && campaign.bannerUrl && (
                  <div
                    className="absolute inset-x-0 z-10 pointer-events-none flex justify-center transition-all duration-75"
                    style={{
                      top: `${overlaySettings.yOffset}%`,
                      opacity: overlaySettings.opacity / 100,
                      transform: `scale(${overlaySettings.scale / 100})`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.bannerUrl}
                      alt={campaign.brandName}
                      className="w-[88%] h-auto max-h-24 object-contain drop-shadow-2xl filter"
                    />
                  </div>
                )}

                {activeCaption && (
                  <div
                    className={`absolute inset-x-4 z-20 flex justify-center text-center pointer-events-none ${captionPositionClass}`}
                  >
                    <span
                      className={`max-w-[92%] leading-snug break-words ${
                        isViralCaption
                          ? 'text-[15px] font-black tracking-wide text-yellow-300'
                          : 'text-[13px] font-extrabold text-white'
                      }`}
                      style={{
                        fontFamily:
                          '"CaptionSans", "CaptionDevanagari", "Noto Sans Devanagari", "Inter", "Apple Color Emoji", "Segoe UI Emoji", sans-serif',
                        textTransform: isViralCaption ? 'uppercase' : 'none',
                        WebkitTextStroke: isViralCaption ? '2.5px #000' : '1.5px #000',
                        paintOrder: 'stroke',
                        textShadow: isViralCaption
                          ? '0 3px 0 #000, 0 5px 14px rgba(0,0,0,0.95)'
                          : '0 2px 0 #000, 0 3px 8px rgba(0,0,0,0.9)',
                      }}
                    >
                      {activeCaption.text}
                    </span>
                  </div>
                )}

                {/* Platform Mockups */}
                <YouTubeShortsOverlay visible={activePlatform === 'youtube'} />
                <InstagramReelsOverlay visible={activePlatform === 'instagram'} />
                <TikTokOverlay
                  visible={activePlatform === 'tiktok'}
                  creatorName={creatorNameText}
                  creatorHandle={creatorHandle}
                />
                <SafeZoneGuidesOverlay
                  visible={showSafeZoneGrid}
                  campaignMode={campaign.campaignMode}
                />
                <CreatorFacecamGuide
                  visible={isCreatorMode && showFacecamGuide}
                  creatorName={creatorNameText}
                />

                {/* Play / Pause floating prompt on pause */}
                {!isPlaying && (
                  <div
                    onClick={togglePlay}
                    className="absolute inset-0 z-20 bg-black/30 flex items-center justify-center cursor-pointer backdrop-blur-[1px]"
                  >
                    <div className="w-14 h-14 rounded-full bg-emerald-500/90 text-zinc-950 flex items-center justify-center shadow-xl hover:scale-105 transition">
                      <Play className="w-7 h-7 fill-current ml-1" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* High-Contrast Empty State Upload Card */
              <div className="relative inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center z-10 bg-gradient-to-b from-zinc-900/80 via-zinc-950 to-zinc-950">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-dashed border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
                  <FileVideo className="w-8 h-8 text-emerald-400" />
                </div>

                <h3 className="text-base sm:text-lg font-black text-white mb-1.5">
                  Upload 9:16 Video
                </h3>
                <p className="text-xs text-zinc-400 mb-5 max-w-[240px] leading-relaxed">
                  Drag and drop your vertical MP4 or MOV file here to test platform safe zones.
                </p>

                {/* Prominent Large Green Select Button */}
                <div className="space-y-3 w-full max-w-[250px]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-black text-xs sm:text-sm transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Upload className="w-4 h-4 stroke-[2.5]" />
                    <span>Select MP4 / MOV Video</span>
                  </button>

                  {/* Discreet Demo Clip Link */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      disabled={isLoadingSample}
                      className="text-xs text-zinc-400 hover:text-emerald-400 underline underline-offset-4 transition flex items-center justify-center gap-1.5 mx-auto disabled:opacity-50"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>
                        {isLoadingSample ? 'Loading Demo Clip...' : 'Or load demo 9:16 clip to test'}
                      </span>
                    </button>
                  </div>

                  {sampleError && (
                    <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-2 py-1.5">
                      {sampleError}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = '';
            }}
            className="hidden"
            aria-label="Choose an MP4 or MOV video"
          />

          {/* Video Scrubber & Playback Controls Bar */}
          {videoSrc && (
            <div className="w-full max-w-[340px] sm:max-w-[360px] mt-2.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2 shadow-lg">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  )}
                </button>

                <div className="relative flex-1 pb-5">
                  <input
                    type="range"
                    min={0}
                    max={duration > 0 ? duration : 4}
                    step={0.05}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />

                  {isCreatorMode && (
                    <>
                      <span
                        className="absolute top-1.5 h-3 w-px -translate-x-1/2 bg-purple-400/90"
                        style={{ left: '50%' }}
                      />
                      <span
                        className="absolute top-1.5 h-3 w-px -translate-x-1/2 bg-purple-400/90"
                        style={{ left: '85%' }}
                      />
                      <span
                        className="absolute top-4 max-w-[48%] -translate-x-1/2 truncate text-[8px] font-semibold text-purple-300/90"
                        style={{ left: '50%' }}
                        title={injectCreatorName('Verify [Creator Name] still featured', campaign)}
                      >
                        50% · {injectCreatorName('Verify [Creator Name] still featured', campaign)}
                      </span>
                      <span
                        className="absolute top-4 max-w-[32%] -translate-x-1/2 truncate text-[8px] font-semibold text-purple-300/90"
                        style={{ left: '85%' }}
                        title={injectCreatorName('Verify [Creator Name] still featured', campaign)}
                      >
                        85% · {injectCreatorName('Verify [Creator Name] still featured', campaign)}
                      </span>
                    </>
                  )}

                  {audioPeaks.map((peak, index) => (
                    <button
                      key={`peak-${index}-${peak.time}`}
                      type="button"
                      onClick={() => applySeek(peak.time)}
                      title={`🔥 Peak Reaction ${index + 1} · ${formatTime(peak.time)} — click to jump`}
                      aria-label={`Jump to peak reaction ${index + 1} at ${formatTime(peak.time)}`}
                      className="absolute top-0 z-10 -translate-x-1/2 rounded bg-amber-500/20 px-0.5 text-[11px] leading-none text-amber-300 transition hover:bg-amber-500/40 hover:text-amber-200"
                      style={{
                        left: `${Math.min(Math.max(duration > 0 ? (peak.time / duration) * 100 : 0, 0), 100)}%`,
                      }}
                    >
                      🔥
                    </button>
                  ))}

                  {isAnalyzingAudio && (
                    <span className="absolute -top-1 right-0 text-[8px] font-mono text-amber-300/80">
                      scanning audio…
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute original video audio' : 'Mute original video audio'}
                  aria-label={isMuted ? 'Unmute original video audio' : 'Mute original video audio'}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition"
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
                  )}
                </button>

                <span className="text-[11px] font-mono text-zinc-400 min-w-[70px] text-right">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {(audioPeaks.length > 0 || audioPeaksError) && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-mono">
                  {audioPeaks.length > 0 && (
                    <span className="text-amber-300/90">
                      🔥 Peak Reaction × {audioPeaks.length} ·{' '}
                      {audioPeaks.map((peak) => formatTime(peak.time)).join(' · ')} · click marker
                      to jump
                    </span>
                  )}
                  {audioPeaksError && (
                    <span className="text-rose-300 break-words">Peak scan: {audioPeaksError}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[11px] text-zinc-400">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="hover:text-white transition flex items-center gap-1"
                >
                  <Upload className="w-3 h-3 text-emerald-400" />
                  <span>Replace Video</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={isLoadingSample}
                  className="hover:text-amber-300 transition flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>Reload Demo Clip</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Dynamic Panel Depending on Mode */}
        <div className="lg:col-span-5 space-y-4">
          {isCreatorMode ? (
            /* CREATOR MODE: Facecam Framing & Speech-to-Text Captions */
            <>
              {/* Creator Safe-Zone Verification Pill */}
              <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-800/60 shadow-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Creator Safe-Zone Mode: Active
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50">
                    CLEAN VIDEO
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Toggle <strong>Shorts</strong>, <strong>Reels</strong>, or <strong>TikTok</strong> on the canvas to ensure {creatorNameText}&apos;s facecam (upper-center) and subtitles stay clear of platform UI clutter.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-purple-900/60 space-y-4 backdrop-blur-sm">
                <div className="space-y-2 border-b border-zinc-800 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                      Creator Layout Switcher
                    </h3>
                    <span className="text-[10px] font-mono text-purple-300">
                      {splitScreenActive ? '35% / 65% SPLIT' : 'SINGLE 9:16'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOverlaySettings((prev) => ({ ...prev, splitScreen: true }))
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-left text-[11px] font-semibold transition ${
                        splitScreenActive
                          ? 'bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-950/30'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      Split-Screen (Facecam Top + Gameplay Bottom)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOverlaySettings((prev) => ({ ...prev, splitScreen: false }))
                      }
                      className={`w-full px-3 py-2 rounded-xl border text-left text-[11px] font-semibold transition ${
                        !splitScreenActive
                          ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-md shadow-cyan-950/30'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      Single 9:16 Full-Frame (Keep Corner Facecam)
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {isHorizontalSource
                      ? 'Horizontal source detected. Split-screen is selected by default.'
                      : 'Vertical source detected. Keep the original corner facecam in single mode.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => videoFile && void runFacecamDetection(videoFile)}
                    disabled={!videoFile || isDetecting}
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isDetecting ? 'Detecting...' : 'Re-Detect Facecam'}</span>
                  </button>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {detectionResult
                      ? `SCANNED ${detectionResult.scannedAt.join('s / ')}s · ${detectionResult.method.toUpperCase()}`
                      : 'AWAITING VIDEO'}
                  </span>
                </div>

                {detectionError && (
                  <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-2 py-1.5">
                    {detectionError}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wide text-purple-300">
                      Source Crop · Quick Corners
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      DRAG / RESIZE BOX
                    </span>
                  </div>

                  <div
                    ref={cropEditorRef}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerCancel={handleCropPointerUp}
                    className="relative w-full overflow-hidden rounded-xl border border-zinc-700 bg-black"
                    style={{
                      aspectRatio:
                        detectionResult?.sourceAspect ?? overlaySettings.sourceAspect ?? 16 / 9,
                    }}
                  >
                    <canvas
                      ref={sourceCanvasRef}
                      className="absolute inset-0 h-full w-full bg-black pointer-events-none"
                      aria-label="Live source frame with facecam crop"
                    />

                    {!videoSrc && (
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] text-zinc-500 pointer-events-none">
                        Upload a video to detect the facecam
                      </div>
                    )}

                    {effectiveFacecamCrop && (
                      <div
                        onPointerDown={(e) => handleCropPointerDown(e, 'move')}
                        className="absolute border-2 border-emerald-400 bg-emerald-500/15 shadow-[0_0_0_1px_rgba(0,0,0,0.95),0_0_14px_rgba(16,185,129,0.8)] cursor-move touch-none"
                        style={{
                          left: `${effectiveFacecamCrop.x * 100}%`,
                          top: `${effectiveFacecamCrop.y * 100}%`,
                          width: `${effectiveFacecamCrop.width * 100}%`,
                          height: `${effectiveFacecamCrop.height * 100}%`,
                        }}
                      >
                        <span className="absolute -top-4 left-0 whitespace-nowrap rounded bg-black/95 px-1 py-0.5 text-[8px] font-bold text-emerald-300 border border-emerald-500">
                          FACECAM CROP
                        </span>
                        <span
                          onPointerDown={(e) => handleCropPointerDown(e, 'resize')}
                          className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 rounded-sm bg-emerald-400 border border-black shadow-[0_0_8px_rgba(16,185,129,0.9)] cursor-nwse-resize touch-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['top-left', 'Top-Left'],
                        ['top-right', 'Top-Right'],
                        ['bottom-left', 'Bottom-Left'],
                        ['bottom-right', 'Bottom-Right'],
                      ] as [FacecamCorner, string][]
                    ).map(([corner, label]) => (
                      <button
                        key={corner}
                        type="button"
                        onClick={() => handleCornerSnap(corner)}
                        disabled={!overlaySettings.facecamCrop}
                        className="px-2 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 border border-zinc-800 text-[11px] font-semibold text-zinc-300 transition"
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 border-t border-zinc-800 pt-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-300">Facecam Zoom</span>
                        <span className="font-mono text-purple-300 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                          {facecamZoom.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={4}
                        step={0.1}
                        value={facecamZoom}
                        onChange={(event) =>
                          setOverlaySettings((prev) => ({
                            ...prev,
                            facecamZoom: Number(event.target.value),
                          }))
                        }
                        className="w-full accent-purple-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                        <span>1x</span>
                        <span>FACE FILL</span>
                        <span>4x</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-300">Facecam Pan X</span>
                          <span className="font-mono text-cyan-300">{Math.round(facecamPanX)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={facecamPanX}
                          onChange={(event) =>
                            setOverlaySettings((prev) => ({
                              ...prev,
                              facecamPanX: Number(event.target.value),
                            }))
                          }
                          className="w-full accent-cyan-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-zinc-300">Facecam Pan Y</span>
                          <span className="font-mono text-cyan-300">{Math.round(facecamPanY)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={facecamPanY}
                          onChange={(event) =>
                            setOverlaySettings((prev) => ({
                              ...prev,
                              facecamPanY: Number(event.target.value),
                            }))
                          }
                          className="w-full accent-cyan-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-purple-900/60 space-y-4 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      16:9 → 9:16 Facecam Framing
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOverlaySettings((prev) => ({ ...prev, zoom: 100, xOffset: 50 }))
                    }
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
                    title="Reset zoom and pan"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">
                      Zoom · center {creatorNameText}&apos;s facecam
                    </span>
                    <span className="font-mono text-purple-300 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {overlaySettings.zoom ?? 100}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={250}
                    step={1}
                    value={overlaySettings.zoom ?? 100}
                    onChange={(e) => handleZoomChange(Number(e.target.value))}
                    className="w-full accent-purple-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>100%</span>
                    <span>Full frame</span>
                    <span>250%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">
                      Horizontal Pan (X-Offset)
                    </span>
                    <span className="font-mono text-cyan-300 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {overlaySettings.xOffset}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={overlaySettings.xOffset}
                    onChange={(e) => handleXOffsetChange(Number(e.target.value))}
                    className="w-full accent-cyan-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>Left</span>
                    <span>50% = Center</span>
                    <span>Right</span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed border-t border-zinc-800 pt-3">
                  This exact crop and zoom is baked into the exported MP4. Keep {creatorNameText}
                  &apos;s facecam inside the dashed upper-center target zone.
                </p>
              </div>

              <CaptionEditor
                videoFile={videoFile}
                overlaySettings={overlaySettings}
                setOverlaySettings={setOverlaySettings}
                currentTime={currentTime}
              />
            </>
          ) : (
            /* SPONSOR MODE: Overlay Fine-Tuning Controls (Sliders) */
            <>
              {/* Safe-Zone Compliance Verification Pill */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  isWithinSafeBounds
                    ? 'bg-emerald-950/20 border-emerald-800/60 shadow-lg shadow-emerald-950/20'
                    : 'bg-rose-950/20 border-rose-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {isWithinSafeBounds ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {isWithinSafeBounds
                        ? 'Safe-Zone: 100% Compliant'
                        : 'Safe-Zone Collision'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                    STRICT CLAMP
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enforcing safe zone: <strong className="text-zinc-200">{campaign.minYOffset}% – {campaign.maxYOffset}% Y</strong>. Clamped to protect like buttons &amp; captions.
                </p>
              </div>

              {/* Sliders Panel */}
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      Overlay Fine-Tuning Controls
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={resetToBrandDefault}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
                    title="Reset sliders to campaign recommended defaults"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Defaults</span>
                  </button>
                </div>

                {/* Slider 1: Vertical Y-Offset */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">
                      Vertical Y-Position
                    </span>
                    <span className="font-mono text-emerald-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {overlaySettings.yOffset}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={campaign.minYOffset}
                    max={campaign.maxYOffset}
                    step={1}
                    value={overlaySettings.yOffset}
                    onChange={(e) => handleYChange(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>Min: {campaign.minYOffset}%</span>
                    <span className="text-emerald-400">Current: {overlaySettings.yOffset}%</span>
                    <span>Max: {campaign.maxYOffset}%</span>
                  </div>
                </div>

                {/* Slider 2: Scale Factor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">
                      Banner Scale
                    </span>
                    <span className="font-mono text-cyan-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {overlaySettings.scale}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={campaign.minScale}
                    max={campaign.maxScale}
                    step={1}
                    value={overlaySettings.scale}
                    onChange={(e) => handleScaleChange(Number(e.target.value))}
                    className="w-full accent-cyan-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>{campaign.minScale}%</span>
                    <span>Default: {campaign.defaultScale}%</span>
                    <span>{campaign.maxScale}%</span>
                  </div>
                </div>

                {/* Slider 3: Opacity Factor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">
                      Banner Opacity
                    </span>
                    <span className="font-mono text-indigo-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                      {overlaySettings.opacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={campaign.minOpacity}
                    max={campaign.maxOpacity}
                    step={1}
                    value={overlaySettings.opacity}
                    onChange={(e) => handleOpacityChange(Number(e.target.value))}
                    className="w-full accent-indigo-500 h-2 bg-zinc-950 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>{campaign.minOpacity}%</span>
                    <span>{campaign.maxOpacity}%</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Button: Export Compliant MP4 */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-700/80 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {isCreatorMode
                    ? 'Compliance & Tag Engine'
                    : 'Render & Stamping Engine'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                H.264 + AAC
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {isCreatorMode
                ? 'Verifies clean video formatting, preserves crisp audio/resolution, and generates an official Creator Compliance ID for Discord/Whop submissions.'
                : 'Renders a true 9:16 MP4 with original audio preserved, hardcodes the verified Safe-Zone banner, and issues a verified Submission Tag for Discord/Whop moderators.'}
            </p>

            <button
              type="button"
              disabled={!videoFile}
              onClick={() => {
                if (videoFile) {
                  onStartExport(videoFile);
                }
              }}
              className={`w-full py-3 px-5 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 shadow-xl ${
                videoFile
                  ? isCreatorMode
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-purple-500/25 cursor-pointer transform hover:-translate-y-0.5'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 shadow-emerald-500/25 cursor-pointer transform hover:-translate-y-0.5'
                  : 'bg-zinc-800/80 text-zinc-500 border border-zinc-800 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4 fill-current" />
              <span>
                {videoFile
                  ? isCreatorMode
                    ? 'Verify Clean Clip & Get Creator Submission ID'
                    : 'Export Compliant MP4 & Get Verification Code'
                  : 'Select or Drag Video Above First'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
