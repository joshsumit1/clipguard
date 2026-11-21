'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Coins,
  Layers,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Play,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Ban,
  Video,
} from 'lucide-react';
import { CAMPAIGN_MODE_LABELS, CampaignConfig, StreamTimestamp } from '@/types';
import {
  CREATOR_STRICT_RULES,
  getCreatorName,
  getFeaturedTimestamps,
  injectCreatorName,
} from '@/data/presets';
import { copyTextToClipboard, downloadBannerAsPng } from '@/utils/assetHelper';

interface ClipperHeaderProps {
  campaign: CampaignConfig;
  onSeekToTimestamp?: (seconds: number) => void;
}

export const ClipperHeader: React.FC<ClipperHeaderProps> = ({
  campaign,
  onSeekToTimestamp,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [checkedRules, setCheckedRules] = useState<Record<number, boolean>>({});
  const [copiedTimeId, setCopiedTimeId] = useState<string | null>(null);

  const isCreatorMode = campaign.campaignMode === 'creator';
  const creatorName = getCreatorName(campaign);
  const featuredTimestamps = getFeaturedTimestamps(campaign);

  const toggleRule = (idx: number) => {
    setCheckedRules((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleDownloadAsset = async () => {
    if (!campaign.bannerUrl) return;
    try {
      setDownloading(true);
      await downloadBannerAsPng(campaign.bannerUrl, campaign.bannerFilename);
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not download asset. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (!copiedTimeId) return;
    const timeout = setTimeout(() => setCopiedTimeId(null), 2000);
    return () => clearTimeout(timeout);
  }, [copiedTimeId]);

  const handleTimestampClick = async (item: StreamTimestamp) => {
    onSeekToTimestamp?.(item.seconds);
    const copied = await copyTextToClipboard(`[${item.time}] ${item.label}`);
    setCopiedTimeId(copied ? item.id : null);
  };

  const positionLabel =
    campaign.allowedPosition === 'top'
      ? 'Top Safe Zone (12% – 30%)'
      : campaign.allowedPosition === 'bottom'
      ? 'Bottom Above Captions (65% – 77%)'
      : `Custom Safe Bounds (${campaign.minYOffset}% – ${campaign.maxYOffset}%)`;

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-xl mb-4 backdrop-blur-md transition-all">
      {/* Featured Stream Timestamps: always at the very top */}
      {featuredTimestamps.length > 0 && (
        <div
          className={`mb-3 pb-3 border-b ${
            isCreatorMode
              ? 'border-purple-900/70 bg-purple-950/10 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-2 rounded-t-xl'
              : 'border-zinc-800/60'
          }`}
        >
          <div className="flex items-center justify-between mb-2 gap-2">
            <div
              className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${
                isCreatorMode ? 'text-purple-300' : 'text-zinc-300'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 ${isCreatorMode ? 'text-purple-400' : 'text-emerald-400'}`} />
              <span>Featured Stream Timestamps</span>
            </div>
            {campaign.vodUrl && (
              <a
                href={campaign.vodUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 transition"
              >
                <span>Full VOD</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {featuredTimestamps.map((item) => {
              const isCopied = copiedTimeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void handleTimestampClick(item)}
                  className={`text-xs px-3 py-1.5 rounded-xl border text-left transition flex items-center gap-2 group ${
                    isCopied
                      ? 'bg-purple-900/60 border-purple-500 text-white'
                      : isCreatorMode
                        ? 'bg-zinc-950 hover:bg-zinc-800/80 border-purple-900/60 text-zinc-300 hover:text-white hover:border-purple-700'
                        : 'bg-zinc-950 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                  }`}
                  title="Click to seek / copy moment timestamp"
                >
                  <span className="font-mono text-purple-400 font-bold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/50 text-[11px]">
                    {item.time}
                  </span>
                  <span className="truncate max-w-[200px] sm:max-w-[280px]">
                    {item.label}
                  </span>
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span className="text-[10px] font-bold text-emerald-300">Copied!</span>
                    </>
                  ) : (
                    <Play className="w-2.5 h-2.5 text-zinc-500 group-hover:text-purple-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sleek Compact Header Bar (Visible by default) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Payout Pill */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: campaign.accentColor }}
            />
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
              {campaign.brandName}
            </h1>
          </div>

          {/* Mode Badge */}
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1"
            style={{
              backgroundColor: `${campaign.accentColor}15`,
              color: campaign.accentColor,
              borderColor: `${campaign.accentColor}40`,
            }}
          >
            {isCreatorMode ? (
              <>
                <Ban className="w-2.5 h-2.5" />
                <span>{CAMPAIGN_MODE_LABELS.creator}</span>
              </>
            ) : (
              <span>{CAMPAIGN_MODE_LABELS.sponsor}</span>
            )}
          </span>

          {/* Payout Card */}
          <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-white tracking-wide">
              {campaign.payoutRate}
            </span>
          </div>

          {/* Safe Zone Enforced Notice */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>
              {isCreatorMode ? (
                <>Facecam &amp; Subs: <strong className="text-emerald-400">Safe Zones Enforced</strong></>
              ) : (
                <>Lock: <strong className="text-emerald-400">{positionLabel}</strong></>
              )}
            </span>
          </div>
        </div>

        {/* Action Controls: Download Asset (Sponsor Mode) & Expand Checklist Toggle */}
        <div className="flex items-center gap-2">
          {!isCreatorMode && campaign.bannerUrl && (
            <button
              type="button"
              onClick={handleDownloadAsset}
              disabled={downloading}
              className="py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              title="Download official transparent PNG banner for CapCut/Premiere"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">
                {downloading ? 'Exporting...' : 'Download PNG Asset'}
              </span>
              <span className="sm:hidden">PNG</span>
            </button>
          )}

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="py-1.5 px-3 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition flex items-center gap-1.5"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isExpanded ? 'Hide Details' : 'Campaign Rules & Details'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Creator Mode: Strict Rejection & Ban Rules */}
      {isCreatorMode && (
        <div className="mt-3 rounded-xl border-2 border-rose-500/80 bg-gradient-to-br from-rose-950/80 to-red-950/60 p-3 sm:p-4 shadow-lg shadow-rose-950/40">
          <div className="flex items-start gap-2.5 mb-2.5">
            <div className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 flex-shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-rose-200 flex items-center gap-2">
                Strict Rejection &amp; Ban Rules
                <Ban className="w-3.5 h-3.5 text-rose-400" />
              </h3>
              <p className="text-[11px] text-rose-300/90 mt-0.5">
                Non-negotiable for {creatorName} submissions. Violations mean rejection and permanent
                campaign ban.
              </p>
            </div>
          </div>

          <ol className="space-y-2">
            {CREATOR_STRICT_RULES.map((rule, index) => (
              <li
                key={index}
                className="flex gap-2 rounded-lg bg-black/35 border border-rose-900/70 p-2.5 text-xs leading-relaxed text-rose-100"
              >
                <span className="font-mono font-bold text-rose-400 flex-shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{injectCreatorName(rule, campaign)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Expanded Full Details & Compliance Checklist */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-fadeIn">
          {/* Left Column: Asset info or Creator Mode Policy */}
          <div className="lg:col-span-5 space-y-3">
            {isCreatorMode ? (
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/50 space-y-2.5">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                  <Ban className="w-4 h-4 text-purple-400" />
                  <span>Strict Clean-Video Policy</span>
                </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {injectCreatorName(
                      'No sponsor graphics, watermarks, or third-party logos are permitted. [Creator Name] must stay visible throughout the actual edit, not only in the intro.',
                      campaign
                    )}
                  </p>
                  <div className="text-[11px] font-mono text-purple-300/80 bg-purple-950/60 p-2 rounded-lg border border-purple-800/40">
                    Creator: <strong>{creatorName}</strong> ({campaign.creatorHandle || '@streamer'})
                  </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Official Overlay Asset
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    PNG (Transparent)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={campaign.bannerUrl}
                    alt={campaign.brandName}
                    className="w-full max-h-16 object-contain drop-shadow"
                  />
                </div>
              </>
            )}
          </div>

          {/* Right Column: Compliance Checklist */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                Campaign Compliance Checklist
              </h2>
              <span className="text-[11px] text-zinc-500">
                Check all before submitting
              </span>
            </div>

            <div className="space-y-1.5 bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3">
              {campaign.rules.map((rule, idx) => {
                const isChecked = !!checkedRules[idx];
                return (
                  <label
                    key={idx}
                    className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-all border ${
                      isChecked
                        ? 'bg-emerald-950/20 border-emerald-900/40 text-zinc-200'
                        : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRule(idx)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-900 text-emerald-500 cursor-pointer accent-emerald-500"
                    />
                    <div className="text-xs leading-relaxed flex-1 select-none">
                      <span className="font-semibold text-zinc-400 mr-1.5">
                        #{idx + 1}:
                      </span>
                      <span>{injectCreatorName(rule, campaign)}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
