'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  Unlock,
  ShieldCheck,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Sliders,
  DollarSign,
  Palette,
  Eye,
  Ban,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  BannerPosition,
  CAMPAIGN_MODE_LABELS,
  CampaignConfig,
  CampaignMode,
  StreamTimestamp,
} from '@/types';
import { getFeaturedTimestamps, parseTimestampToSeconds } from '@/data/presets';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: CampaignConfig;
  onSaveCampaign: (updated: CampaignConfig) => void;
  isAdminUnlocked: boolean;
  setIsAdminUnlocked: (val: boolean) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onSaveCampaign,
  isAdminUnlocked,
  setIsAdminUnlocked,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Form states
  const [campaignMode, setCampaignMode] = useState<CampaignMode>(campaign.campaignMode || 'sponsor');
  const [brandName, setBrandName] = useState(campaign.brandName);
  const [brandCategory, setBrandCategory] = useState(campaign.brandCategory);
  const [payoutRate, setPayoutRate] = useState(campaign.payoutRate);
  const [allowedPosition, setAllowedPosition] = useState<BannerPosition>(
    campaign.allowedPosition
  );
  const [minYOffset, setMinYOffset] = useState(campaign.minYOffset);
  const [maxYOffset, setMaxYOffset] = useState(campaign.maxYOffset);
  const [defaultYOffset, setDefaultYOffset] = useState(campaign.defaultYOffset);
  const [rules, setRules] = useState<string[]>([...campaign.rules]);
  const [newRuleText, setNewRuleText] = useState('');
  const [bannerUrl, setBannerUrl] = useState(campaign.bannerUrl);
  const [bannerFilename, setBannerFilename] = useState(campaign.bannerFilename);
  const [accentColor, setAccentColor] = useState(campaign.accentColor);

  // Creator Mode form states
  const [creatorName, setCreatorName] = useState(campaign.creatorName || '');
  const [creatorHandle, setCreatorHandle] = useState(campaign.creatorHandle || '');
  const [vodUrl, setVodUrl] = useState(campaign.vodUrl || '');
  const [streamTimestamps, setStreamTimestamps] = useState<StreamTimestamp[]>(() =>
    getFeaturedTimestamps(campaign)
  );

  const [saveSuccess, setSaveSuccess] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  // Synchronize when campaign changes
  useEffect(() => {
    setCampaignMode(campaign.campaignMode || 'sponsor');
    setBrandName(campaign.brandName);
    setBrandCategory(campaign.brandCategory);
    setPayoutRate(campaign.payoutRate);
    setAllowedPosition(campaign.allowedPosition);
    setMinYOffset(campaign.minYOffset);
    setMaxYOffset(campaign.maxYOffset);
    setDefaultYOffset(campaign.defaultYOffset);
    setRules([...campaign.rules]);
    setBannerUrl(campaign.bannerUrl);
    setBannerFilename(campaign.bannerFilename);
    setAccentColor(campaign.accentColor);
    setCreatorName(campaign.creatorName || '');
    setCreatorHandle(campaign.creatorHandle || '');
    setVodUrl(campaign.vodUrl || '');
    setStreamTimestamps(getFeaturedTimestamps(campaign));
  }, [campaign]);

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
    if (!saveSuccess) return;
    const timeout = setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
    return () => clearTimeout(timeout);
  }, [saveSuccess, onClose]);

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234') {
      setIsAdminUnlocked(true);
      setPinError(false);
      setPinInput('');
    } else {
      setPinError(true);
    }
  };

  const handleModeChange = (mode: CampaignMode) => {
    setCampaignMode(mode);
    if (mode === 'creator') {
      if (!creatorName.trim()) setCreatorName('Rakazone Gaming');
    }
  };

  const handlePositionPresetChange = (pos: BannerPosition) => {
    setAllowedPosition(pos);
    if (pos === 'top') {
      setMinYOffset(12);
      setMaxYOffset(30);
      setDefaultYOffset(15);
    } else if (pos === 'bottom') {
      setMinYOffset(65);
      setMaxYOffset(77);
      setDefaultYOffset(73);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBannerFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setBannerUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddRule = () => {
    if (!newRuleText.trim()) return;
    setRules((prev) => [...prev, newRuleText.trim()]);
    setNewRuleText('');
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTimestampChange = (
    id: string,
    field: 'time' | 'label',
    value: string
  ) => {
    setStreamTimestamps((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
              seconds:
                field === 'time' ? parseTimestampToSeconds(value) : item.seconds,
            }
          : item
      )
    );
  };

  const handleSave = () => {
    const updated: CampaignConfig = {
      ...campaign,
      campaignMode,
      brandName,
      brandCategory,
      payoutRate,
      allowedPosition,
      minYOffset,
      maxYOffset,
      defaultYOffset,
      rules,
      bannerUrl: campaignMode === 'creator' ? '' : bannerUrl,
      bannerFilename: campaignMode === 'creator' ? '' : bannerFilename,
      accentColor: campaignMode === 'creator' && accentColor === '#10b981' ? '#a855f7' : accentColor,
      creatorName: creatorName.trim() || undefined,
      creatorHandle: creatorHandle.trim() || undefined,
      vodUrl: vodUrl.trim() || undefined,
      streamTimestamps: getFeaturedTimestamps({
        ...campaign,
        streamTimestamps: streamTimestamps.map((item) => ({
          ...item,
          seconds: parseTimestampToSeconds(item.time),
        })),
      }),
    };
    onSaveCampaign(updated);
    setSaveSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121215] border border-zinc-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl relative text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-[#121215]/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Brand &amp; Campaign Admin Panel
                {isAdminUnlocked && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    AUTHENTICATED
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                Mode Switching • Safe-Zone Locks • VOD Timestamps
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

        {/* PIN Security Check */}
        {!isAdminUnlocked ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-inner">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-bold text-white">
                Sponsor Authentication Required
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Enter your 4-digit Brand Manager PIN to switch campaign modes, edit
                rules, and configure creator timestamps.
              </p>
              <div className="text-xs font-mono text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 rounded-lg py-1 px-2.5 inline-block">
                Default PIN: <strong>1234</strong>
              </div>
            </div>

            <form onSubmit={handlePinSubmit} className="w-full max-w-xs space-y-4">
              <div className="relative">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="• • • •"
                  className={`w-full text-center text-2xl tracking-[1em] font-mono py-3 rounded-xl bg-zinc-950 border ${
                    pinError
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-zinc-800 focus:border-emerald-500'
                  } text-white focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                  autoFocus
                />
              </div>

              {pinError && (
                <p className="text-xs text-rose-400 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Incorrect PIN. Please use 1234.
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20"
              >
                Unlock Admin Controls
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Admin Form */
          <div className="p-6 space-y-6">
            {/* 1. CAMPAIGN MODE SWITCHER (SPONSOR VS CREATOR) */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Campaign Compliance Mode
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Switch between sponsor overlays or strict creator &amp; gaming clean clipping
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  MODE SWITCH
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode 1: Sponsor Mode */}
                <button
                  type="button"
                  onClick={() => handleModeChange('sponsor')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    campaignMode === 'sponsor'
                      ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md shadow-emerald-950/20'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 ${
                      campaignMode === 'sponsor'
                        ? 'border-emerald-400 bg-emerald-500'
                        : 'border-zinc-700 bg-zinc-900'
                    }`}
                  >
                    {campaignMode === 'sponsor' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-black" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-white">
                      {CAMPAIGN_MODE_LABELS.sponsor}
                    </span>
                    <span className="text-[11px] text-zinc-400 leading-snug block mt-0.5">
                      Forces verified sponsor PNG banners inside safe boundaries with fine-tuning sliders.
                    </span>
                  </div>
                </button>

                {/* Mode 2: Creator Mode */}
                <button
                  type="button"
                  onClick={() => handleModeChange('creator')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    campaignMode === 'creator'
                      ? 'bg-purple-950/40 border-purple-500 text-white shadow-md shadow-purple-950/20'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center flex-shrink-0 ${
                      campaignMode === 'creator'
                        ? 'border-purple-400 bg-purple-500'
                        : 'border-zinc-700 bg-zinc-900'
                    }`}
                  >
                    {campaignMode === 'creator' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-white flex items-center gap-1.5">
                      {CAMPAIGN_MODE_LABELS.creator}
                    </span>
                    <span className="text-[11px] text-zinc-400 leading-snug block mt-0.5">
                      Strict creator-first policy: hides all external logos, enables facecam framing, and requires anti-rejection sign-off.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Core Campaign Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {campaignMode === 'creator' ? 'Campaign / Streamer Title' : 'Campaign / Brand Name'}
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Payout Rate (Shown to Clippers)
                </label>
                <input
                  type="text"
                  value={payoutRate}
                  onChange={(e) => setPayoutRate(e.target.value)}
                  placeholder="e.g. ₹60 / 1K Views"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {campaignMode === 'creator' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Creator Name
                    </label>
                    <input
                      type="text"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      placeholder="e.g. Rakazone Gaming"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Creator Social Handle
                    </label>
                    <input
                      type="text"
                      value={creatorHandle}
                      onChange={(e) => setCreatorHandle(e.target.value)}
                      placeholder="e.g. @rakazone"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Category
                    </label>
                    <select
                      value={brandCategory}
                      onChange={(e) =>
                        setBrandCategory(e.target.value as CampaignConfig['brandCategory'])
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Gaming">Gaming</option>
                      <option value="Fintech">Fintech</option>
                      <option value="E-Commerce">E-Commerce</option>
                      <option value="Lifestyle">Lifestyle</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Brand Accent Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-9 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 3. CREATOR MODE: FEATURED STREAM TIMESTAMPS */}
            {campaignMode === 'creator' && (
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      3 Featured Stream Timestamps
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Clippers see these clickable, copyable pills at the top of the campaign header.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-purple-300">3 / 3 MOMENTS</span>
                </div>

                <div className="space-y-2">
                  {streamTimestamps.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 sm:grid-cols-[110px_1fr] gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800"
                    >
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-purple-300 uppercase tracking-wide">
                          Moment {index + 1} · Timestamp
                        </label>
                        <input
                          type="text"
                          value={item.time}
                          onChange={(event) =>
                            handleTimestampChange(item.id, 'time', event.target.value)
                          }
                          placeholder="14:22"
                          className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-purple-300 font-mono text-[11px] focus:outline-none focus:border-purple-500"
                          aria-label={`Featured timestamp ${index + 1}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-purple-300 uppercase tracking-wide">
                          Moment Title
                        </label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(event) =>
                            handleTimestampChange(item.id, 'label', event.target.value)
                          }
                          placeholder="Funny GTA RP Rage Moment"
                          className="w-full px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-[11px] focus:outline-none focus:border-purple-500"
                          aria-label={`Moment title ${index + 1}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. SPONSOR MODE: Safe-Zone Position Locking & Banner Upload */}
            {campaignMode === 'sponsor' && (
              <>
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        Enforced Safe-Zone Placement Lock
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Clippers will be strictly clamped within this verified region.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      ANTI-ACCIDENT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handlePositionPresetChange('top')}
                      className={`p-3 rounded-xl border text-left transition ${
                        allowedPosition === 'top'
                          ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">Top Safe Zone</span>
                        {allowedPosition === 'top' && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Y: 12% – 30% (Under header)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePositionPresetChange('bottom')}
                      className={`p-3 rounded-xl border text-left transition ${
                        allowedPosition === 'bottom'
                          ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">Bottom Above Captions</span>
                        {allowedPosition === 'bottom' && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Y: 65% – 77% (Above captions)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePositionPresetChange('custom')}
                      className={`p-3 rounded-xl border text-left transition ${
                        allowedPosition === 'custom'
                          ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">Custom Safe Range</span>
                        {allowedPosition === 'custom' && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Manual boundary clamping
                      </p>
                    </button>
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        Upload Official Brand/Sponsor Banner
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Transparent PNG or SVG banner (Recommended: 800x160)
                      </p>
                    </div>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-700 flex items-center gap-1.5 transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Browse File</span>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg"
                        onChange={handleBannerUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {bannerUrl && (
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center min-h-[70px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={bannerUrl}
                        alt="Official Sponsor Banner"
                        className="max-h-16 w-auto object-contain drop-shadow"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 6. Live Rules Checklist Editor */}
            <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Campaign Compliance Rules Text
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Clippers must review and abide by these rules to qualify for payout. Use{' '}
                    <code className="text-purple-300">[Creator Name]</code> in any rule or warning; it is
                    replaced everywhere with the creator name above.
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-500">
                  {rules.length} Active Rules
                </span>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs"
                  >
                    <span className="text-zinc-500 font-mono text-[11px] w-5">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => {
                        const newR = [...rules];
                        newR[idx] = e.target.value;
                        setRules(newR);
                      }}
                      className="flex-1 bg-transparent text-zinc-200 border-none focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(idx)}
                      className="p-1 text-zinc-500 hover:text-rose-400 transition"
                      title="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newRuleText}
                  onChange={(e) => setNewRuleText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRule();
                    }
                  }}
                  placeholder="Type new campaign requirement..."
                  className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Rule</span>
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAdminUnlocked(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Admin Panel</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Enforced &amp; Saved!</span>
                    </>
                  ) : (
                    <span>Apply &amp; Enforce for Clippers</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
