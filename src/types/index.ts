export type CampaignMode = 'sponsor' | 'creator';
export type BannerPosition = 'top' | 'bottom' | 'custom';
export type PlatformOverlay = 'none' | 'youtube' | 'instagram' | 'tiktok';

export const CAMPAIGN_MODE_LABELS: Record<CampaignMode, string> = {
  sponsor: 'Sponsor Mode (Overlay Required)',
  creator: 'Creator & Gaming Mode (Strict No-Logo Policy)',
};

export const DEFAULT_VIRAL_HOOKS: string[] = [
  'POV: {creatorName} thought getting clipped was a joke until chat caught that moment. {hashtags}',
  '{creatorName} really said this live and acted like nothing happened. {hashtags}',
  'Wait for the exact second {creatorName} realizes the clip is already trending. {hashtags}',
];

export interface StreamTimestamp {
  id: string;
  time: string; // e.g. "04:12"
  seconds: number; // in seconds for seeking
  label: string; // e.g. "Rage breaks his chair laughing"
}

export interface CampaignConfig {
  id: string;
  brandName: string;
  brandCategory: 'Gaming' | 'Fintech' | 'E-Commerce' | 'Lifestyle' | 'Creator';
  campaignMode: CampaignMode; // 'sponsor' | 'creator'
  payoutRate: string;
  rules: string[];
  bannerUrl: string; // Data URL or Image URL
  bannerFilename: string;
  allowedPosition: BannerPosition;
  minYOffset: number; // Percentage (e.g. 10%)
  maxYOffset: number; // Percentage (e.g. 80%)
  defaultYOffset: number;
  defaultScale: number; // e.g. 85%
  defaultOpacity: number; // e.g. 95%
  minScale: number; // 50%
  maxScale: number; // 120%
  minOpacity: number; // 70%
  maxOpacity: number; // 100%
  accentColor: string;

  // Creator Mode specific fields
  creatorName?: string;
  creatorHandle?: string;
  mandatoryHashtags?: string[];
  viralHooks?: string[];
  streamTimestamps?: StreamTimestamp[];
  vodUrl?: string;
}

export type FacecamCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type CaptionPosition = 'upper' | 'center' | 'lower';
export type CaptionLanguage = 'english' | 'hindi' | 'hinglish';
export type CaptionStyle = 'classic' | 'viral';

export interface CaptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface CaptionBurnSettings {
  burn: boolean;
  position: CaptionPosition;
  style: CaptionStyle;
  segments: CaptionSegment[];
}

export interface SourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlaySettings {
  scale: number; // 50 to 120 (%)
  opacity: number; // 70 to 100 (%)
  yOffset: number; // clamped percentage (e.g. 12% to 75%)
  xOffset: number; // clamped percentage (default 50 = centered)
  zoom: number; // 100 to 250 (%)
  splitScreen?: boolean;
  facecamCrop?: SourceRect;
  gameplayCrop?: SourceRect;
  sourceAspect?: number;
  facecamZoom?: number;
  facecamPanX?: number;
  facecamPanY?: number;
  captions?: CaptionBurnSettings;
}

export interface VerificationResult {
  code: string;
  timestamp: string;
  brandName: string;
  payoutRate: string;
  campaignMode: CampaignMode;
  safeZoneCompliance: 'PASSED' | 'FLAGGED';
  coordinates: {
    y: number;
    scale: number;
    opacity: number;
  };
  selectedHook?: string;
  formattedCaption?: string;
  duration: number;
  resolution: string;
  downloadUrl?: string;
  fileSize?: string;
}
