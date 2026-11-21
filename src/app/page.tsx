'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SAMPLE_CAMPAIGNS, cloneCampaigns, normalizeCampaign } from '@/data/presets';
import { CampaignConfig, OverlaySettings } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ClipperHeader } from '@/components/ClipperHeader';
import { StudioCanvas } from '@/components/StudioCanvas';
import { AdminModal } from '@/components/AdminModal';
import { ExportModal } from '@/components/ExportModal';
import { ShieldCheck, FileCheck2, MessageSquare } from 'lucide-react';

const CAMPAIGNS_STORAGE_KEY = 'clipguard.campaigns.v1';
const ACTIVE_CAMPAIGN_STORAGE_KEY = 'clipguard.activeCampaignId.v1';

const createOverlaySettings = (campaign: CampaignConfig): OverlaySettings => ({
  yOffset: Math.min(
    Math.max(campaign.defaultYOffset, campaign.minYOffset),
    campaign.maxYOffset
  ),
  scale: Math.min(Math.max(campaign.defaultScale, campaign.minScale), campaign.maxScale),
  opacity: Math.min(
    Math.max(campaign.defaultOpacity, campaign.minOpacity),
    campaign.maxOpacity
  ),
  xOffset: 50,
  zoom: 100,
  splitScreen: false,
  facecamCrop: undefined,
  gameplayCrop: undefined,
  sourceAspect: undefined,
  facecamZoom: 1.5,
  facecamPanX: 50,
  facecamPanY: 50,
  captions: { burn: false, position: 'center', style: 'classic', segments: [] },
});

export default function ClipGuardStudio() {
  const [campaigns, setCampaigns] = useState<CampaignConfig[]>(() => cloneCampaigns());
  const [activeCampaignId, setActiveCampaignId] = useState<string>(SAMPLE_CAMPAIGNS[0].id);
  const [hasHydrated, setHasHydrated] = useState(false);

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [externalSeekTime, setExternalSeekTime] = useState<number | null>(null);

  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>(() =>
    createOverlaySettings(SAMPLE_CAMPAIGNS[0])
  );

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [videoToExport, setVideoToExport] = useState<File | Blob | null>(null);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? campaigns[0],
    [campaigns, activeCampaignId]
  );

  useEffect(() => {
    try {
      const storedCampaigns = window.localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
      if (storedCampaigns) {
        const parsed: unknown = JSON.parse(storedCampaigns);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const restored = SAMPLE_CAMPAIGNS.map((defaultCampaign) => {
            const stored = parsed.find(
              (item): item is Record<string, unknown> =>
                typeof item === 'object' &&
                item !== null &&
                (item as Record<string, unknown>).id === defaultCampaign.id
            );
            return stored ? normalizeCampaign(stored, defaultCampaign) : cloneCampaigns([defaultCampaign])[0];
          });
          const storedActiveId = window.localStorage.getItem(ACTIVE_CAMPAIGN_STORAGE_KEY);
          const nextActiveId =
            restored.find((campaign) => campaign.id === storedActiveId)?.id ?? restored[0].id;
          setCampaigns(restored);
          setActiveCampaignId(nextActiveId);
        }
      }
    } catch (error) {
      console.warn('ClipGuard could not restore saved campaigns:', error);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    } catch (error) {
      console.warn('ClipGuard could not persist campaigns:', error);
    }
  }, [campaigns, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    try {
      window.localStorage.setItem(ACTIVE_CAMPAIGN_STORAGE_KEY, activeCampaignId);
    } catch (error) {
      console.warn('ClipGuard could not persist the active campaign:', error);
    }
  }, [activeCampaignId, hasHydrated]);

  const resetStudioForCampaign = useCallback((campaign: CampaignConfig) => {
    setOverlaySettings(createOverlaySettings(campaign));
  }, []);

  useEffect(() => {
    resetStudioForCampaign(activeCampaign);
  }, [activeCampaign, resetStudioForCampaign]);

  const handleSelectCampaign = useCallback(
    (campaign: CampaignConfig) => {
      setActiveCampaignId(campaign.id);
      resetStudioForCampaign(campaign);
    },
    [resetStudioForCampaign]
  );

  const handleSaveCampaign = useCallback(
    (updated: CampaignConfig) => {
      setCampaigns((previous) => {
        const exists = previous.some((campaign) => campaign.id === updated.id);
        return exists
          ? previous.map((campaign) => (campaign.id === updated.id ? updated : campaign))
          : [...previous, updated];
      });
      setActiveCampaignId(updated.id);
      resetStudioForCampaign(updated);
    },
    [resetStudioForCampaign]
  );

  const handleStartExport = useCallback((video: File | Blob) => {
    setVideoToExport(video);
    setIsExportOpen(true);
  }, []);

  const handleSeekFromTimestamp = useCallback((seconds: number) => {
    setExternalSeekTime(seconds);
  }, []);

  const closeAdmin = useCallback(() => setIsAdminOpen(false), []);
  const closeExport = useCallback(() => setIsExportOpen(false), []);
  const openAdmin = useCallback(() => setIsAdminOpen(true), []);

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-zinc-100 selection:bg-emerald-500 selection:text-black">
      <Navbar
        activeCampaign={activeCampaign}
        allCampaigns={campaigns}
        onSelectCampaign={handleSelectCampaign}
        onOpenAdmin={openAdmin}
        isAdminUnlocked={isAdminUnlocked}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-5">
        <ClipperHeader campaign={activeCampaign} onSeekToTimestamp={handleSeekFromTimestamp} />

        <StudioCanvas
          campaign={activeCampaign}
          overlaySettings={overlaySettings}
          setOverlaySettings={setOverlaySettings}
          onStartExport={handleStartExport}
          externalSeekTime={externalSeekTime}
        />

        <section className="mt-12 pt-8 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Two Campaign Modes</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Supports both <strong>Sponsor Mode (Overlay Required)</strong> and{' '}
              <strong>Creator &amp; Gaming Mode (Strict No-Logo Policy)</strong> with VOD
              timestamps.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Speech-to-Text Auto-Captions</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generates and burns Hindi, English, or Hinglish captions from spoken audio with an
              editable SRT timeline.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-800 text-indigo-400 flex items-center justify-center font-bold">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Verified Submission Tag</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Generates an immutable verification ID (e.g. CG-8492-VERIFIED) that clippers paste into
              Discord or Whop for instant approval by moderators.
            </p>
          </div>
        </section>
      </main>

      <AdminModal
        isOpen={isAdminOpen}
        onClose={closeAdmin}
        campaign={activeCampaign}
        onSaveCampaign={handleSaveCampaign}
        isAdminUnlocked={isAdminUnlocked}
        setIsAdminUnlocked={setIsAdminUnlocked}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={closeExport}
        videoFile={videoToExport}
        campaign={activeCampaign}
        overlaySettings={overlaySettings}
      />

      <footer className="border-t border-zinc-900 py-6 px-4 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-zinc-400">ClipGuard Studio</span>
            <span>• YouTube Shorts, Instagram Reels &amp; TikTok Safe-Zone Compliance</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <span>
              Sponsor Setup PIN: <strong className="text-zinc-300">1234</strong>
            </span>
            <span>•</span>
            <span>H.264 / AAC Clean &amp; Stamped Engine</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
