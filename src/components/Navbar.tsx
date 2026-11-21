'use client';

import React from 'react';
import { ShieldCheck, Lock, Sparkles, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { CampaignConfig } from '@/types';

interface NavbarProps {
  activeCampaign: CampaignConfig;
  allCampaigns: CampaignConfig[];
  onSelectCampaign: (campaign: CampaignConfig) => void;
  onOpenAdmin: () => void;
  isAdminUnlocked: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeCampaign,
  allCampaigns,
  onSelectCampaign,
  onOpenAdmin,
  isAdminUnlocked,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/20 text-white">
            <ShieldCheck className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#09090b] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">
                Clip<span className="text-emerald-400">Guard</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                Studio v2.4
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Brand Compliance &amp; Safe-Zone Stamping Engine
            </p>
          </div>
        </div>

        {/* Campaign Preset Switcher & Admin Button */}
        <div className="flex items-center gap-3">
          {/* Preset Selector */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <span className="text-xs font-medium text-zinc-400 px-2 hidden md:inline">
              Preset:
            </span>
            {allCampaigns.map((c) => {
              const isSelected = c.id === activeCampaign.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCampaign(c)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.accentColor }}
                  />
                  <span>{c.brandCategory}</span>
                </button>
              );
            })}
          </div>

          {/* Upload Video Quick Action */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('studio-canvas');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 text-xs font-bold transition shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Upload Video</span>
            <span className="text-[11px]">↓</span>
          </button>

          {/* Admin Sponsor Setup Button */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isAdminUnlocked
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-300 hover:bg-amber-900/50'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
            }`}
          >
            {isAdminUnlocked ? (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Sponsor Admin</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Sponsor Setup</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
