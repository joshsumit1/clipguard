'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Play,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  RotateCcw,
  Clock,
  Coins,
  FileCheck,
  Ban,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CampaignConfig, OverlaySettings, VerificationResult } from '@/types';
import {
  CREATOR_SIGN_OFF_ITEMS,
  getCreatorHandle,
  getCreatorName,
  injectCreatorName,
} from '@/data/presets';
import { copyTextToClipboard } from '@/utils/assetHelper';
import { renderCompliantVideo, RenderProgress } from '@/utils/ffmpeg';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoFile: File | Blob | null;
  campaign: CampaignConfig;
  overlaySettings: OverlaySettings;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  videoFile,
  campaign,
  overlaySettings,
}) => {
  const [progress, setProgress] = useState<RenderProgress>({
    stage: 'loading-engine',
    percent: 5,
    message: 'Starting Safe-Zone Verification & Export...',
  });
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedTag, setCopiedTag] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [signOff, setSignOff] = useState<boolean[]>([false, false, false, false]);
  const [exportConfirmed, setExportConfirmed] = useState(false);
  const runIdRef = useRef(0);

  const isCreatorMode = campaign.campaignMode === 'creator';
  const creatorName = getCreatorName(campaign);
  const creatorHandle = getCreatorHandle(campaign);
  const isSignedOff = signOff.every(Boolean);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const url = result?.downloadUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [result?.downloadUrl]);

  useEffect(() => {
    if (!isOpen) return;
    setSignOff([false, false, false, false]);
    setExportConfirmed(!isCreatorMode);
    setResult(null);
    setErrorMsg(null);
    setProgress({
      stage: 'loading-engine',
      percent: 5,
      message: 'Starting Safe-Zone Verification & Export...',
    });
  }, [isOpen, videoFile, isCreatorMode]);

  useEffect(() => {
    if (!isOpen || !videoFile || (isCreatorMode && !exportConfirmed)) return;

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    let isActive = true;

    setResult(null);
    setErrorMsg(null);
    setCopiedCode(false);
    setCopiedTag(false);

    const run = async () => {
      try {
        const res = await renderCompliantVideo(
          videoFile,
          isCreatorMode ? null : campaign.bannerUrl,
          overlaySettings,
          campaign.brandName,
          campaign.payoutRate,
          campaign.campaignMode,
          undefined,
          undefined,
          (p) => {
            if (isActive && runIdRef.current === runId) setProgress(p);
          }
        );

        if (!isActive || runIdRef.current !== runId) {
          URL.revokeObjectURL(res.downloadUrl ?? '');
          return;
        }

        setResult(res);
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 },
            colors: isCreatorMode
              ? ['#a855f7', '#06b6d4', '#ec4899', '#fbbf24']
              : ['#10b981', '#06b6d4', '#6366f1', '#fbbf24'],
          });
        } catch {
          setErrorMsg(null);
        }
      } catch (err: unknown) {
        console.error('Export error:', err);
        if (isActive && runIdRef.current === runId) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'Failed to complete video export. Please retry.'
          );
        }
      }
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [
    isOpen,
    videoFile,
    campaign,
    overlaySettings,
    isCreatorMode,
    exportConfirmed,
    retryCount,
  ]);

  useEffect(() => {
    if (!copiedCode) return;
    const timeout = setTimeout(() => setCopiedCode(false), 2000);
    return () => clearTimeout(timeout);
  }, [copiedCode]);

  useEffect(() => {
    if (!copiedTag) return;
    const timeout = setTimeout(() => setCopiedTag(false), 2500);
    return () => clearTimeout(timeout);
  }, [copiedTag]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    if (!result) return;
    const copied = await copyTextToClipboard(result.code);
    if (copied) setCopiedCode(true);
  };

  const submissionTag = result
    ? isCreatorMode
      ? `[ClipGuard Creator Verified: ${result.code} | Streamer: ${creatorName} | Policy: Zero Logos (Clean Video) | Rate: ${result.payoutRate}]`
      : `[ClipGuard Verified: ${result.code} | Brand: ${result.brandName} | SafeZone: Compliant (Y:${result.coordinates.y}%) | Rate: ${result.payoutRate}]`
    : '';

  const handleCopySubmissionTag = async () => {
    if (!submissionTag) return;
    const copied = await copyTextToClipboard(submissionTag);
    if (copied) setCopiedTag(true);
  };

  const handleDownloadMp4 = () => {
    if (!result?.downloadUrl) return;
    const a = document.createElement('a');
    a.href = result.downloadUrl;
    const cleanBrand = campaign.brandName.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `ClipGuard_${cleanBrand}_${result.code}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSignOffChange = (index: number) => {
    setSignOff((previous) => previous.map((value, i) => (i === index ? !value : value)));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121215] border border-zinc-700/80 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl relative text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-[#121215]/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border text-white ${
                isCreatorMode
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {isCreatorMode
                  ? 'Creator Clean-Video Verification'
                  : 'Safe-Zone Stamping & Verification'}
              </h2>
              <p className="text-xs text-zinc-400">
                {campaign.brandName} • Payout: {campaign.payoutRate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6">
          {/* Creator Mode: Mandatory Anti-Rejection Sign-Off Gate */}
          {isCreatorMode && !exportConfirmed && (
            <div className="p-4 rounded-2xl border-2 border-rose-500/70 bg-rose-950/25 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 flex-shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-rose-200">
                    Mandatory Anti-Rejection Sign-Off
                  </h3>
                  <p className="text-[11px] text-rose-300/90 mt-0.5">
                    Check all 4 boxes to unlock Render &amp; Export MP4 and generate the CG-VERIFIED
                    submission tag for {creatorName}.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {CREATOR_SIGN_OFF_ITEMS.map((item, index) => (
                  <label
                    key={index}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      signOff[index]
                        ? 'bg-emerald-950/25 border-emerald-700/70 text-zinc-100'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-rose-800/80'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={signOff[index]}
                      onChange={() => handleSignOffChange(index)}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500 cursor-pointer flex-shrink-0"
                    />
                    <span className="text-xs leading-relaxed select-none">
                      <span className="font-mono text-rose-400 font-bold mr-1.5">
                        {index + 1}.
                      </span>
                      {injectCreatorName(item, campaign)}
                    </span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                disabled={!isSignedOff}
                onClick={() => {
                  setProgress({
                    stage: 'loading-engine',
                    percent: 5,
                    message: 'Sign-off accepted. Starting clean video export...',
                  });
                  setExportConfirmed(true);
                }}
                className={`w-full py-3 px-5 rounded-xl text-xs font-black uppercase tracking-wide transition flex items-center justify-center gap-2 ${
                  isSignedOff
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Render &amp; Export MP4</span>
              </button>

              {!isSignedOff && (
                <p className="text-center text-[10px] text-zinc-500 font-mono">
                  {signOff.filter(Boolean).length} / 4 CONFIRMATIONS
                </p>
              )}
            </div>
          )}

          {isCreatorMode && exportConfirmed && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-800/70 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Anti-rejection sign-off accepted — verified submission tag can now be generated.
              </span>
            </div>
          )}

          {/* STATE 1: Error */}
          {errorMsg && (
            <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-800 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-900/50 text-rose-400 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Rendering Error</h3>
                <p className="text-xs text-rose-300 mt-1">{errorMsg}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProgress({
                    stage: 'loading-engine',
                    percent: 5,
                    message: 'Retrying export...',
                  });
                  setRetryCount((count) => count + 1);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition inline-flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Export</span>
              </button>
            </div>
          )}

          {/* STATE 2: Loading / In-Progress */}
          {!result && !errorMsg && (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative w-20 h-20">
                <div
                  className={`w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-pulse ${
                    isCreatorMode ? 'text-purple-400' : 'text-emerald-400'
                  }`}
                >
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-emerald-500 opacity-20 blur-sm animate-spin" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-bold text-white">
                  {isCreatorMode
                    ? 'Auditing Clean 9:16 Video & Exporting MP4'
                    : 'Rendering 9:16 Compliant MP4'}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  {progress.message}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md space-y-2">
                <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 shadow-md ${
                      isCreatorMode
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-purple-500/20'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 shadow-emerald-500/20'
                    }`}
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-mono text-zinc-500">
                  <span>Stage: {progress.stage}</span>
                  <span
                    className={`font-bold ${
                      isCreatorMode ? 'text-purple-400' : 'text-emerald-400'
                    }`}
                  >
                    {progress.percent}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: Success & Verified Compliance Certificate */}
          {result && (
            <div className="space-y-6">
              {/* Top Verified Header */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                  isCreatorMode
                    ? 'bg-purple-950/20 border-purple-800/80'
                    : 'bg-emerald-950/20 border-emerald-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg ${
                      isCreatorMode
                        ? 'bg-purple-500 text-white shadow-purple-500/20'
                        : 'bg-emerald-500 text-zinc-950 shadow-emerald-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                      {isCreatorMode
                        ? 'Clean-Video Compliance Verified!'
                        : 'Safe-Zone Compliance Verified!'}
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    </h3>
                    <p
                      className={`text-xs font-medium ${
                        isCreatorMode ? 'text-purple-300/90' : 'text-emerald-300/90'
                      }`}
                    >
                      {isCreatorMode
                        ? 'Zero-Logos/Watermarks policy checked. Facecam and subtitles in safe zones.'
                        : 'Official banner stamped within safe boundaries (Zero dead zone overlap).'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-full border font-bold ${
                    isCreatorMode
                      ? 'bg-purple-900/60 text-purple-300 border-purple-700/60'
                      : 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                  }`}
                >
                  PASSED
                </span>
              </div>

              {/* Unique Verification Code Box */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Unique Verification Code
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Audit Hash
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                  <span
                    className={`text-lg font-black font-mono tracking-wider ${
                      isCreatorMode ? 'text-purple-400' : 'text-emerald-400'
                    }`}
                  >
                    {result.code}
                  </span>
                  <button
                    onClick={() => void handleCopyCode()}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Submission Tag for Discord / Whop */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-900 border border-zinc-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Official Submission Tag (Discord / Whop)
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Required for Payout
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300 break-all select-all">
                  {submissionTag}
                </div>

                <button
                  onClick={() => void handleCopySubmissionTag()}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${
                    copiedTag
                      ? 'bg-emerald-600 text-white'
                      : isCreatorMode
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                  }`}
                >
                  {copiedTag ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied! Ready to paste into Discord/Whop #submissions</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Full Submission Tag</span>
                    </>
                  )}
                </button>
              </div>

              {/* Rendered MP4 Video Preview */}
              {result.downloadUrl && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                    Rendered MP4 Preview ({isCreatorMode ? 'Clean 9:16' : 'Stamped 9:16'})
                  </span>
                  <div className="relative max-w-[220px] mx-auto aspect-[9/16] rounded-2xl overflow-hidden border border-zinc-800 bg-black shadow-xl">
                    <video
                      src={result.downloadUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Technical Audit Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">
                    Resolution
                  </span>
                  <span className="font-semibold text-zinc-300">
                    {result.resolution}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">
                    Audio Track
                  </span>
                  <span className="font-semibold text-emerald-400">
                    AAC Stereo (Preserved)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">
                    {isCreatorMode ? 'Policy Check' : 'Y-Coordinate'}
                  </span>
                  <span
                    className={`font-semibold font-mono ${
                      isCreatorMode ? 'text-purple-400' : 'text-cyan-400'
                    }`}
                  >
                    {isCreatorMode ? 'Zero Logos' : `${result.coordinates.y}% Clamped`}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase">
                    File Size
                  </span>
                  <span className="font-semibold text-zinc-300 font-mono">
                    {result.fileSize || 'Standard'}
                  </span>
                </div>
              </div>

              {/* Action: Download MP4 File */}
              <button
                type="button"
                onClick={handleDownloadMp4}
                className={`w-full py-3.5 px-6 rounded-xl font-extrabold text-sm transition shadow-xl flex items-center justify-center gap-2 transform hover:-translate-y-0.5 cursor-pointer ${
                  isCreatorMode
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-purple-500/25'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 shadow-emerald-500/25'
                }`}
              >
                <Download className="w-5 h-5" />
                <span>
                  {isCreatorMode
                    ? 'Download Clean 9:16 MP4 Video'
                    : 'Download Stamped 9:16 MP4 Video'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
