'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Flame,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Type,
} from 'lucide-react';
import {
  CaptionBurnSettings,
  CaptionLanguage,
  CaptionPosition,
  OverlaySettings,
} from '@/types';
import {
  formatCaptionsAsSrt,
  parseSrtCaptions,
  transcribeVideoCaptions,
  TranscriptionUpdate,
} from '@/utils/transcriber';

interface CaptionEditorProps {
  videoFile: File | Blob | null;
  overlaySettings: OverlaySettings;
  setOverlaySettings: React.Dispatch<React.SetStateAction<OverlaySettings>>;
  currentTime?: number;
}

const DEFAULT_CAPTIONS: CaptionBurnSettings = {
  burn: false,
  position: 'center',
  style: 'classic',
  segments: [],
};

const LANGUAGE_LABELS: Record<CaptionLanguage, string> = {
  english: 'English (en)',
  hindi: 'Hindi (hi)',
  hinglish: 'Hinglish (Hindi Audio -> Roman/English Script)',
};

export const CaptionEditor: React.FC<CaptionEditorProps> = ({
  videoFile,
  overlaySettings,
  setOverlaySettings,
  currentTime = 0,
}) => {
  const captions = overlaySettings.captions ?? DEFAULT_CAPTIONS;
  const [language, setLanguage] = useState<CaptionLanguage>('hinglish');
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<TranscriptionUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(formatCaptionsAsSrt(captions.segments));
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(formatCaptionsAsSrt(captions.segments));
  }, [captions.segments]);

  const updateCaptions = (patch: Partial<CaptionBurnSettings>) => {
    setOverlaySettings((prev) => ({
      ...prev,
      captions: { ...(prev.captions ?? DEFAULT_CAPTIONS), ...patch },
    }));
  };

  const handleGenerate = async () => {
    if (!videoFile) {
      setError('Upload a video first, then generate captions.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStatus({ percent: 0, message: 'Preparing local transcription...' });

    try {
      const segments = await transcribeVideoCaptions(videoFile, language, setStatus);
      updateCaptions({ segments, burn: segments.length > 0 ? captions.burn : false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Caption generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDraftBlur = () => {
    if (!draft.trim()) {
      updateCaptions({ segments: [] });
      setError(null);
      return;
    }

    const parsed = parseSrtCaptions(draft);
    if (parsed.length > 0) {
      updateCaptions({ segments: parsed });
      setError(null);
      return;
    }

    setError('Could not parse caption lines. Use HH:MM:SS,mmm --> HH:MM:SS,mmm with text below.');
  };

  const handleAddManualLine = () => {
    const existing = draft.trim() ? parseSrtCaptions(draft) : captions.segments;
    const lastEnd = existing.reduce((latest, segment) => Math.max(latest, segment.end), 0);
    const start = Math.max(Number.isFinite(currentTime) ? currentTime : 0, lastEnd, 0);
    const newText = 'Type your caption here';
    const next = [
      ...existing,
      {
        id: `caption-manual-${Date.now()}`,
        start,
        end: start + 2.5,
        text: newText,
      },
    ].sort((a, b) => a.start - b.start);
    const nextDraft = formatCaptionsAsSrt(next);

    setDraft(nextDraft);
    updateCaptions({ segments: next });
    setError(null);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const selectionStart = nextDraft.indexOf(newText);
      if (selectionStart >= 0) {
        textarea.setSelectionRange(selectionStart, selectionStart + newText.length);
      }
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-cyan-900/60 space-y-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Hindi &amp; English Auto-Captions
          </h3>
          <p className="text-[11px] text-zinc-400 mt-1">
            Local Whisper transcription. Edit any line and choose the viral look before burning it
            into the MP4.
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 flex-shrink-0">
          LOCAL AI
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as CaptionLanguage)}
          className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
          aria-label="Caption transcription language"
        >
          {(Object.keys(LANGUAGE_LABELS) as CaptionLanguage[]).map((option) => (
            <option key={option} value={option}>
              {LANGUAGE_LABELS[option]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={!videoFile || isGenerating}
          className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {isGenerating
              ? 'Generating Captions...'
              : 'Auto-Generate Captions (Hindi / English / Hinglish)'}
          </span>
        </button>
      </div>

      {status && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
            <span className="min-w-0 flex-1 pr-2 break-words">{status.message}</span>
            <span className="flex-shrink-0">{status.percent}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-950 border border-zinc-800"
            role="progressbar"
            aria-valuenow={status.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{ width: `${status.percent}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-900/60 rounded-lg px-2 py-1.5 flex items-start gap-1.5 break-words">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Timestamped Caption Editor
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {captions.segments.length} LINES · SRT FORMAT
          </span>
        </div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={handleDraftBlur}
          rows={6}
          spellCheck={false}
          placeholder={'1\n00:00:01,000 --> 00:00:04,000\nYour caption text here'}
          className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-200 leading-relaxed focus:outline-none focus:border-cyan-500 resize-y"
          aria-label="Editable timestamped captions"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-zinc-500">
            Keep the timestamp arrows intact. Devanagari, Hinglish and emojis are supported.
          </p>
          <button
            type="button"
            onClick={handleAddManualLine}
            className="px-2.5 py-1.5 rounded-lg border border-cyan-800 bg-cyan-950/40 text-[10px] font-bold text-cyan-200 hover:bg-cyan-900/60 flex items-center gap-1 transition"
          >
            + Add Manual Subtitle Line
          </button>
        </div>
      </div>

      <div className="space-y-2 border-t border-zinc-800 pt-3">
        <span className="text-[10px] font-mono uppercase tracking-wide text-cyan-300 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-cyan-400" />
          Caption Style
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateCaptions({ style: 'classic' })}
            className={`px-3 py-2 rounded-xl border text-left transition ${
              captions.style === 'classic'
                ? 'bg-zinc-800 border-cyan-500 text-white shadow-md'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span
              className="block text-sm font-bold text-white"
              style={{ textShadow: '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000' }}
            >
              Aa
            </span>
            <span className="text-[10px] font-semibold">Classic Clean White</span>
          </button>
          <button
            type="button"
            onClick={() => updateCaptions({ style: 'viral' })}
            className={`px-3 py-2 rounded-xl border text-left transition ${
              captions.style === 'viral'
                ? 'bg-amber-950/50 border-amber-400 text-white shadow-md'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span
              className="block text-sm font-black uppercase text-yellow-300"
              style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke' }}
            >
              Aa
            </span>
            <span className="text-[10px] font-semibold leading-tight">
              Viral Yellow Highlight (Bold Uppercase + Black Outline)
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-zinc-800 pt-3">
        <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 cursor-pointer">
          <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            Burn Captions into Video
          </span>
          <input
            type="checkbox"
            checked={captions.burn}
            onChange={(event) => updateCaptions({ burn: event.target.checked })}
            className="h-4 w-4 accent-cyan-500 cursor-pointer"
          />
        </label>

        <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[11px] font-semibold text-zinc-300 flex-shrink-0">Position</span>
          <select
            value={captions.position}
            onChange={(event) =>
              updateCaptions({ position: event.target.value as CaptionPosition })
            }
            className="flex-1 min-w-0 bg-transparent text-[11px] text-cyan-200 focus:outline-none"
          >
            <option value="upper">Upper safe zone</option>
            <option value="center">Center above UI</option>
            <option value="lower">Lower above UI</option>
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <span>
          {captions.style === 'viral'
            ? 'VIRAL YELLOW · UPPERCASE · BLACK OUTLINE'
            : 'BOLD WHITE · BLACK OUTLINE'}
        </span>
        <span className={captions.burn ? 'text-emerald-400' : ''}>
          {captions.burn ? 'BURN-IN ENABLED' : 'BURN-IN OFF'}
        </span>
      </div>

      {captions.burn && captions.segments.length > 0 && (
        <p className="text-[10px] text-emerald-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Edited captions will be baked into the final MP4 during export.
        </p>
      )}
    </div>
  );
};
