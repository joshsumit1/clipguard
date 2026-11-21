'use client';

import React from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Repeat2,
  Music2,
  Search,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Plus,
} from 'lucide-react';
import { CampaignMode } from '@/types';

interface OverlayProps {
  visible: boolean;
  campaignMode?: CampaignMode;
  creatorName?: string;
  creatorHandle?: string;
}

export const YouTubeShortsOverlay: React.FC<OverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3.5 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
          <span className="text-[11px] font-bold tracking-tight text-white flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            Shorts
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <Search className="w-4 h-4 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-white/10">
            <MoreVertical className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Middle & Right Rail */}
      <div className="flex-1 flex justify-end items-end pb-24 pr-1">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Like */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
              <ThumbsUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold tracking-tight drop-shadow">124K</span>
          </div>

          {/* Dislike */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
              <ThumbsDown className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold tracking-tight drop-shadow">Dislike</span>
          </div>

          {/* Comments */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold tracking-tight drop-shadow">2,842</span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold tracking-tight drop-shadow">Share</span>
          </div>

          {/* Remix */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
              <Repeat2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold tracking-tight drop-shadow">Remix</span>
          </div>

          {/* Audio Square */}
          <div className="w-8 h-8 rounded-lg bg-zinc-800 border-2 border-white/80 overflow-hidden shadow-lg mt-1 flex items-center justify-center animate-spin" style={{ animationDuration: '6s' }}>
            <Music2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Bottom Area: Channel info, caption, audio */}
      <div className="space-y-2 pb-2 pl-1 pr-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6 -mx-3.5 -mb-3.5 px-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center font-bold text-xs border border-white/20">
            C
          </div>
          <span className="text-xs font-bold text-white drop-shadow">@creator_studio</span>
          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold tracking-wide">
            Subscribe
          </span>
        </div>

        <p className="text-xs text-white/95 line-clamp-2 drop-shadow font-medium">
          Check out the verified safe zone setup for shorts campaigns! 🔥 #ClipGuard #Sponsor
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-medium">
          <Music2 className="w-3.5 h-3.5 text-white" />
          <span className="truncate">Original Sound - Trending Monetization Beats</span>
        </div>

        <div className="w-full h-0.5 bg-white/20 rounded-full overflow-hidden mt-1">
          <div className="w-2/5 h-full bg-red-600" />
        </div>
      </div>
    </div>
  );
};

export const InstagramReelsOverlay: React.FC<OverlayProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3.5 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
          <span className="text-xs font-bold tracking-tight text-white">Reels</span>
          <span className="text-[10px] text-zinc-300">▼</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10">
          <Camera className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Middle & Right Rail */}
      <div className="flex-1 flex justify-end items-end pb-20 pr-1">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Heart className="w-6 h-6 text-white drop-shadow" />
            <span className="text-[10px] font-bold tracking-tight drop-shadow">89.4K</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <MessageCircle className="w-6 h-6 text-white drop-shadow" />
            <span className="text-[10px] font-bold tracking-tight drop-shadow">1,208</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Share2 className="w-6 h-6 text-white drop-shadow" />
            <span className="text-[10px] font-bold tracking-tight drop-shadow">12.5K</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Bookmark className="w-5 h-5 text-white drop-shadow" />
          </div>

          <div className="flex flex-col items-center gap-1">
            <MoreVertical className="w-5 h-5 text-white drop-shadow" />
          </div>

          <div className="w-7 h-7 rounded-md border-2 border-white/80 overflow-hidden bg-zinc-800 flex items-center justify-center shadow-lg">
            <Music2 className="w-3.5 h-3.5 text-pink-400" />
          </div>
        </div>
      </div>

      {/* Bottom Area */}
      <div className="space-y-2 pb-2 pl-1 pr-14 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-6 -mx-3.5 -mb-3.5 px-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 border border-white/30" />
          <span className="text-xs font-bold text-white drop-shadow">clipping_pro</span>
          <span className="text-[11px] font-semibold text-white/90 border border-white/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
            Follow
          </span>
        </div>

        <p className="text-xs text-white/95 line-clamp-2 drop-shadow font-normal">
          Always check your reel safe zones before publishing your clipping submission! 🎯 ... more
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-white/80">
          <Music2 className="w-3.5 h-3.5 text-white" />
          <span className="truncate">clipping_pro • Audio track trending</span>
        </div>
      </div>
    </div>
  );
};

export const TikTokOverlay: React.FC<OverlayProps> = ({
  visible,
  creatorName = '[Creator Name]',
  creatorHandle = '@creator',
}) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3.5 text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10">
          <Radio className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-3 text-xs font-bold tracking-wide">
          <span className="text-white/60">Following</span>
          <span className="text-white border-b-2 border-white pb-0.5">For You</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center border border-white/10">
          <Search className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Middle & Right Rail */}
      <div className="flex-1 flex justify-end items-end pb-20 pr-1">
        <div className="flex flex-col items-center gap-3.5 text-center">
          {/* Creator Profile Avatar with Follow Plus */}
          <div className="relative mb-1">
            <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-tr from-cyan-400 to-pink-500 flex items-center justify-center font-bold text-xs text-white shadow-lg">
              YR
            </div>
            <div className="absolute -bottom-1 inset-x-0 mx-auto w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center text-white border border-black shadow">
              <Plus className="w-3 h-3 stroke-[3]" />
            </div>
          </div>

          {/* Like */}
          <div className="flex flex-col items-center gap-0.5">
            <Heart className="w-6 h-6 text-white drop-shadow fill-white/80" />
            <span className="text-[10px] font-bold tracking-tight drop-shadow">342.8K</span>
          </div>

          {/* Comments */}
          <div className="flex flex-col items-center gap-0.5">
            <MessageCircle className="w-6 h-6 text-white drop-shadow fill-white/80" />
            <span className="text-[10px] font-bold tracking-tight drop-shadow">4,812</span>
          </div>

          {/* Bookmark */}
          <div className="flex flex-col items-center gap-0.5">
            <Bookmark className="w-6 h-6 text-white drop-shadow fill-white/80" />
            <span className="text-[10px] font-bold tracking-tight drop-shadow">28.4K</span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center gap-0.5">
            <Share2 className="w-6 h-6 text-white drop-shadow fill-white/80" />
            <span className="text-[10px] font-bold tracking-tight drop-shadow">36.1K</span>
          </div>

          {/* Spinning Vinyl Record */}
          <div
            className="w-9 h-9 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center mt-1 animate-spin shadow-lg"
            style={{ animationDuration: '4s' }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-cyan-400 to-pink-500" />
          </div>
        </div>
      </div>

      {/* Bottom Caption & Audio */}
      <div className="space-y-1.5 pb-2 pl-1 pr-14 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-6 -mx-3.5 -mb-3.5 px-3.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white drop-shadow">
            {creatorHandle}_highlights
          </span>
        </div>

        <p className="text-xs text-white/95 line-clamp-2 drop-shadow font-normal leading-snug">
          Bro was not expecting chat to expose this live on stream 💀😭 #yourrage #streamer #clips #viral
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-medium">
          <Music2 className="w-3.5 h-3.5 text-white" />
          <span className="truncate">original sound - {creatorName} Stream Highlights</span>
        </div>
      </div>
    </div>
  );
};

interface CreatorFacecamGuideProps extends OverlayProps {
  creatorName?: string;
}

export const CreatorFacecamGuide: React.FC<CreatorFacecamGuideProps> = ({
  visible,
  creatorName = '[Creator Name]',
}) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      <div className="absolute top-[13%] left-[7%] right-[25%] h-[30%] rounded-2xl border-2 border-dashed border-purple-300/95 bg-purple-500/10 shadow-[0_0_24px_rgba(168,85,247,0.3)] flex items-start justify-center">
        <span className="mt-1.5 max-w-[90%] rounded-lg bg-purple-950/90 border border-purple-600/80 px-2 py-1 text-center text-[9px] font-bold leading-tight text-purple-100 backdrop-blur-sm">
          Facecam Target Zone — Keep {creatorName} Visible Here
        </span>
      </div>
      <span className="absolute top-[44.5%] left-[7%] rounded bg-purple-950/85 px-1.5 py-0.5 text-[8px] font-mono text-purple-300 border border-purple-800/70">
        CLEAR OF SHORTS / REELS / TIKTOK UI
      </span>
    </div>
  );
};

export const SafeZoneGuidesOverlay: React.FC<OverlayProps> = ({
  visible,
  campaignMode = 'sponsor',
}) => {
  if (!visible) return null;

  const isCreatorMode = campaignMode === 'creator';

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20">
      {/* Top Dead Zone Warning */}
      <div className="absolute top-0 inset-x-0 h-[11%] bg-rose-500/20 border-b-2 border-dashed border-rose-500/80 flex items-center justify-center px-4">
        <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          TOP DEAD ZONE (Search &amp; Header UI)
        </span>
      </div>

      {/* Right Dead Zone (Buttons rail) */}
      <div className="absolute top-[11%] right-0 bottom-[24%] w-[18%] bg-rose-500/15 border-l-2 border-dashed border-rose-500/80 flex items-center justify-center">
        <span className="text-[9px] font-mono font-bold text-rose-300 bg-rose-950/80 px-1 py-1 rounded border border-rose-800 -rotate-90 whitespace-nowrap">
          DEAD ZONE (Engagement Icons)
        </span>
      </div>

      {/* Bottom Dead Zone (Captions & Profile) */}
      <div className="absolute bottom-0 inset-x-0 h-[24%] bg-rose-500/20 border-t-2 border-dashed border-rose-500/80 flex items-center justify-center px-4">
        <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          BOTTOM DEAD ZONE (Captions &amp; Sound Ticker)
        </span>
      </div>

      {/* Safe Zone Highlighting Box */}
      <div className="absolute top-[12%] left-[4%] right-[20%] bottom-[25%] border-2 border-emerald-400/90 bg-emerald-500/5 rounded-lg flex flex-col justify-between p-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {isCreatorMode
              ? 'FACECAM SAFE ZONE (Streamer Camera)'
              : 'TOP SAFE ZONE (Sponsor Banner)'}
          </span>
          <span className="text-[9px] font-mono text-emerald-400">9:16 Compliant</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {isCreatorMode
              ? 'SUBTITLES SAFE ZONE (Clear of UI)'
              : 'BOTTOM SAFE ZONE (Above Captions)'}
          </span>
          <span className="text-[9px] font-mono text-emerald-400">Zero UI Clutter</span>
        </div>
      </div>
    </div>
  );
};
