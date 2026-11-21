import {
  CampaignConfig,
  DEFAULT_VIRAL_HOOKS,
  BannerPosition,
  CampaignMode,
  StreamTimestamp,
} from '@/types';

// Crisp Gaming Sponsor Banner SVG (800x160)
const gamingBannerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="160" viewBox="0 0 800 160">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0e17" />
      <stop offset="50%" stop-color="#111927" />
      <stop offset="100%" stop-color="#051b14" />
    </linearGradient>
    <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="50%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="794" height="154" rx="28" fill="url(#bgGrad)" stroke="#10b981" stroke-width="3" />
  <g transform="translate(32, 28)">
    <rect width="104" height="104" rx="22" fill="#03261a" stroke="#10b981" stroke-width="2.5" />
    <path d="M 28 66 C 22 66 18 60 20 48 C 22 36 32 30 52 30 C 72 30 82 36 84 48 C 86 60 82 66 76 66 C 70 66 66 58 52 58 C 38 58 34 66 28 66 Z" fill="url(#neonGrad)" />
    <rect x="30" y="44" width="12" height="4" rx="2" fill="#04150f" />
    <rect x="34" y="40" width="4" height="12" rx="2" fill="#04150f" />
    <circle cx="68" cy="44" r="3" fill="#04150f" />
    <circle cx="74" cy="48" r="3" fill="#04150f" />
  </g>
  <g transform="translate(160, 26)">
    <rect x="0" y="4" width="138" height="24" rx="12" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="1" />
    <text x="69" y="20" fill="#34d399" font-family="'Inter', sans-serif" font-size="11" font-weight="800" letter-spacing="1.5" text-anchor="middle">OFFICIAL SPONSOR</text>
    <text x="0" y="60" fill="#ffffff" font-family="'Inter', sans-serif" font-size="30" font-weight="900" letter-spacing="0.5">
      APEX ARENA <tspan fill="url(#neonGrad)">CYBER CLASH</tspan>
    </text>
    <text x="0" y="90" fill="#94a3b8" font-family="'Inter', sans-serif" font-size="16" font-weight="600">
      Play Solo or Squads • ₹5,00,000 Prize Pool • Download Free
    </text>
  </g>
  <g transform="translate(620, 42)">
    <rect width="148" height="76" rx="20" fill="url(#badgeGrad)" />
    <text x="74" y="34" fill="#ffffff" font-family="'Inter', sans-serif" font-size="14" font-weight="800" text-anchor="middle">USE CODE</text>
    <text x="74" y="58" fill="#ffffff" font-family="'Inter', sans-serif" font-size="20" font-weight="900" letter-spacing="1" text-anchor="middle">APEX75</text>
  </g>
</svg>
`)}`;

// Crisp Fintech Sponsor Banner SVG (800x160)
const fintechBannerSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="160" viewBox="0 0 800 160">
  <defs>
    <linearGradient id="fintechBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1026" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="violetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#818cf8" />
      <stop offset="50%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#f472b6" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#a855f7" />
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="794" height="154" rx="28" fill="url(#fintechBg)" stroke="#6366f1" stroke-width="3" />
  <g transform="translate(32, 28)">
    <rect width="104" height="104" rx="22" fill="#131738" stroke="#818cf8" stroke-width="2" />
    <g transform="translate(18, 26)">
      <rect width="68" height="52" rx="8" fill="url(#cardGrad)" />
      <rect x="8" y="14" width="12" height="10" rx="3" fill="#fbbf24" />
      <circle cx="50" cy="36" r="6" fill="#f43f5e" opacity="0.8" />
      <circle cx="56" cy="36" r="6" fill="#fbbf24" opacity="0.8" />
    </g>
  </g>
  <g transform="translate(160, 26)">
    <rect x="0" y="4" width="146" height="24" rx="12" fill="rgba(99, 102, 241, 0.2)" stroke="#818cf8" stroke-width="1" />
    <text x="73" y="20" fill="#a5b4fc" font-family="'Inter', sans-serif" font-size="11" font-weight="800" letter-spacing="1.5" text-anchor="middle">VERIFIED PARTNER</text>
    <text x="0" y="60" fill="#ffffff" font-family="'Inter', sans-serif" font-size="30" font-weight="900" letter-spacing="0.5">
      CrediPay <tspan fill="url(#violetGrad)">Metal Card</tspan>
    </text>
    <text x="0" y="90" fill="#94a3b8" font-family="'Inter', sans-serif" font-size="16" font-weight="600">
      Zero Annual Fee • 5% Unlimited Cashback • Instant KYC
    </text>
  </g>
  <g transform="translate(620, 42)">
    <rect width="148" height="76" rx="20" fill="#4f46e5" />
    <text x="74" y="34" fill="#e0e7ff" font-family="'Inter', sans-serif" font-size="13" font-weight="800" text-anchor="middle">GET 1ST CARD</text>
    <text x="74" y="58" fill="#ffffff" font-family="'Inter', sans-serif" font-size="22" font-weight="900" letter-spacing="1" text-anchor="middle">FREE</text>
  </g>
</svg>
`)}`;

export const CREATOR_STRICT_RULES: string[] = [
  'Creator Throughout: Edited content MUST contain [Creator Name] throughout the actual edit—videos only featuring [Creator Name] in the intro will be rejected.',
  "Zero Hate Farming: Videos CANNOT 'hate farm' or create a negative false narrative (subject to rejection and permanent campaign ban).",
  'Clean Metadata & Thumbnails: No repetitive/non-content-matching clickbait thumbnails and no Japanese captions or descriptions.',
];

export const CREATOR_SIGN_OFF_ITEMS: string[] = [
  '[Creator Name] is featured throughout the actual edit (not just the intro).',
  'Zero hate farming or negative false narratives.',
  'Zero logos, CapCut watermarks, non-matching thumbnails, or Japanese captions/descriptions.',
  'Facecam and subtitles sit cleanly inside platform safe zones.',
];

export const DEFAULT_FEATURED_TIMESTAMPS: Omit<StreamTimestamp, 'id'>[] = [
  { time: '14:22', seconds: 862, label: 'Funny GTA RP Rage Moment' },
  { time: '28:40', seconds: 1720, label: 'Insane 1v4 Clutch' },
  { time: '01:14:22', seconds: 4462, label: 'Rage Quits After 1v1' },
];

export const SAMPLE_CAMPAIGNS: CampaignConfig[] = [
  {
    id: 'campaign-gaming-apex',
    brandName: 'Apex Arena: Cyber Clash',
    brandCategory: 'Gaming',
    campaignMode: 'sponsor',
    payoutRate: '₹75 / 1K Views',
    rules: [
      'Official sponsor banner must remain visible throughout the entire clip without flickering.',
      'Banner must be placed strictly within Verified Safe Zones (no overlap with platform UI or captions).',
      'Original gameplay/audio must be preserved with clear game sounds.',
      'Add sponsor hashtag #ApexArena and affiliate link in your first pinned comment.',
      'Submit rendered MP4 along with the generated ClipGuard Verification ID.',
    ],
    bannerUrl: gamingBannerSvg,
    bannerFilename: 'ApexArena_Official_Banner_9x16.png',
    allowedPosition: 'top',
    minYOffset: 12,
    maxYOffset: 30,
    defaultYOffset: 15,
    defaultScale: 88,
    defaultOpacity: 95,
    minScale: 60,
    maxScale: 115,
    minOpacity: 75,
    maxOpacity: 100,
    accentColor: '#10b981',
  },
  {
    id: 'campaign-fintech-credipay',
    brandName: 'CrediPay: Smart Metal Card',
    brandCategory: 'Fintech',
    campaignMode: 'sponsor',
    payoutRate: '₹50 / 1K Views',
    rules: [
      'Position the CrediPay banner in the Bottom Safe Zone strictly above caption text.',
      'No competitor payment logos, watermark distortion, or video quality degradation.',
      'Minimum video length of 7 seconds with 9:16 vertical aspect ratio.',
      'Mention promo code "CLIP50" in video text overlay or audio commentary.',
      'Copy and paste the generated Compliance Tag into the Discord #clip-submissions channel.',
    ],
    bannerUrl: fintechBannerSvg,
    bannerFilename: 'CrediPay_Official_Banner_9x16.png',
    allowedPosition: 'bottom',
    minYOffset: 65,
    maxYOffset: 77,
    defaultYOffset: 73,
    defaultScale: 85,
    defaultOpacity: 95,
    minScale: 55,
    maxScale: 110,
    minOpacity: 75,
    maxOpacity: 100,
    accentColor: '#6366f1',
  },
  {
    id: 'campaign-creator-rakazone',
    brandName: 'Rakazone Gaming — Creator Clips',
    brandCategory: 'Creator',
    campaignMode: 'creator',
    creatorName: 'Rakazone Gaming',
    creatorHandle: '@rakazone',
    payoutRate: '₹60 / 1K Views',
    rules: [
      ...CREATOR_STRICT_RULES,
      'Edited content MUST contain [Creator Name] throughout the actual edit, not only in the intro.',
      'Video must be 9:16 vertical with the facecam in the upper-center safe zone and subtitles above bottom captions.',
      'Use one of the approved viral hooks and mandatory hashtags in the post caption.',
      'Copy and paste the verified Compliance Tag and approved caption into the Discord #creator-payouts channel.',
    ],
    bannerUrl: '',
    bannerFilename: '',
    allowedPosition: 'top',
    minYOffset: 10,
    maxYOffset: 30,
    defaultYOffset: 15,
    defaultScale: 80,
    defaultOpacity: 100,
    minScale: 50,
    maxScale: 120,
    minOpacity: 70,
    maxOpacity: 100,
    accentColor: '#a855f7',
    mandatoryHashtags: [
      '#rakazone',
      '#gaming',
      '#clips',
      '#viral',
    ],
    viralHooks: [...DEFAULT_VIRAL_HOOKS],
    streamTimestamps: DEFAULT_FEATURED_TIMESTAMPS.map((timestamp, index) => ({
      ...timestamp,
      id: `featured-${index}`,
    })),
    vodUrl: 'https://www.youtube.com/@rakazone',
  },
];

const CAMPAIGN_MODES: CampaignMode[] = ['sponsor', 'creator'];
const BANNER_POSITIONS: BannerPosition[] = ['top', 'bottom', 'custom'];
const BRAND_CATEGORIES: CampaignConfig['brandCategory'][] = [
  'Gaming',
  'Fintech',
  'E-Commerce',
  'Lifestyle',
  'Creator',
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringOr = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const stringArrayOr = (value: unknown, fallback: string[]): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [...fallback];

export function parseTimestampToSeconds(value: string): number {
  const parts = value
    .trim()
    .split(':')
    .map((part) => Number.parseInt(part, 10));

  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export function getFeaturedTimestamps(
  campaign: Pick<CampaignConfig, 'streamTimestamps' | 'creatorName' | 'brandName'>
): StreamTimestamp[] {
  const source = Array.isArray(campaign.streamTimestamps) ? campaign.streamTimestamps : [];

  return DEFAULT_FEATURED_TIMESTAMPS.map((fallback, index) => {
    const item = source[index];
    const time = typeof item?.time === 'string' && item.time.trim() ? item.time.trim() : fallback.time;
    const label =
      typeof item?.label === 'string' && item.label.trim() ? item.label.trim() : fallback.label;

    return {
      id: typeof item?.id === 'string' && item.id ? item.id : `featured-${index}`,
      time,
      label,
      seconds: numberOr(item?.seconds, parseTimestampToSeconds(time)),
    };
  });
}

export function cloneCampaign(campaign: CampaignConfig): CampaignConfig {
  return {
    ...campaign,
    rules: [...campaign.rules],
    mandatoryHashtags: campaign.mandatoryHashtags ? [...campaign.mandatoryHashtags] : undefined,
    viralHooks: campaign.viralHooks ? [...campaign.viralHooks] : undefined,
    streamTimestamps: campaign.streamTimestamps
      ? campaign.streamTimestamps.map((timestamp) => ({ ...timestamp }))
      : undefined,
  };
}

export function cloneCampaigns(
  campaigns: CampaignConfig[] = SAMPLE_CAMPAIGNS
): CampaignConfig[] {
  return campaigns.map(cloneCampaign);
}

export function normalizeCampaign(
  raw: unknown,
  fallback: CampaignConfig
): CampaignConfig {
  if (!isRecord(raw)) return cloneCampaign(fallback);

  const mode = CAMPAIGN_MODES.includes(raw.campaignMode as CampaignMode)
    ? (raw.campaignMode as CampaignMode)
    : fallback.campaignMode;
  const rawCategory = raw.brandCategory as CampaignConfig['brandCategory'];
  const rawPosition = raw.allowedPosition as BannerPosition;
  const fallbackCopy = cloneCampaign(fallback);

  const storedTimestamps = Array.isArray(raw.streamTimestamps)
    ? raw.streamTimestamps.filter(isRecord).map((item, index) =>
        typeof item.time === 'string' && typeof item.label === 'string'
          ? {
              id: stringOr(item.id, `t_${index}`),
              time: item.time,
              seconds: numberOr(item.seconds, parseTimestampToSeconds(item.time)),
              label: item.label,
            }
          : null
      )
    : null;

  const normalized: CampaignConfig = {
    id: stringOr(raw.id, fallback.id),
    brandName: stringOr(raw.brandName, fallback.brandName),
    brandCategory: BRAND_CATEGORIES.includes(rawCategory)
      ? rawCategory
      : fallback.brandCategory,
    campaignMode: mode,
    payoutRate: stringOr(raw.payoutRate, fallback.payoutRate),
    rules: stringArrayOr(raw.rules, fallback.rules),
    bannerUrl: mode === 'creator' ? '' : stringOr(raw.bannerUrl, fallback.bannerUrl),
    bannerFilename:
      mode === 'creator' ? '' : stringOr(raw.bannerFilename, fallback.bannerFilename),
    allowedPosition: BANNER_POSITIONS.includes(rawPosition)
      ? rawPosition
      : fallback.allowedPosition,
    minYOffset: numberOr(raw.minYOffset, fallback.minYOffset),
    maxYOffset: numberOr(raw.maxYOffset, fallback.maxYOffset),
    defaultYOffset: numberOr(raw.defaultYOffset, fallback.defaultYOffset),
    defaultScale: numberOr(raw.defaultScale, fallback.defaultScale),
    defaultOpacity: numberOr(raw.defaultOpacity, fallback.defaultOpacity),
    minScale: numberOr(raw.minScale, fallback.minScale),
    maxScale: numberOr(raw.maxScale, fallback.maxScale),
    minOpacity: numberOr(raw.minOpacity, fallback.minOpacity),
    maxOpacity: numberOr(raw.maxOpacity, fallback.maxOpacity),
    accentColor: stringOr(raw.accentColor, fallback.accentColor),
    creatorName: stringOr(raw.creatorName, fallbackCopy.creatorName || ''),
    creatorHandle: stringOr(raw.creatorHandle, fallbackCopy.creatorHandle || ''),
    mandatoryHashtags: stringArrayOr(
      raw.mandatoryHashtags,
      fallbackCopy.mandatoryHashtags || []
    ),
    viralHooks: stringArrayOr(raw.viralHooks, fallbackCopy.viralHooks || DEFAULT_VIRAL_HOOKS),
    streamTimestamps:
      storedTimestamps === null
        ? fallbackCopy.streamTimestamps
        : storedTimestamps.filter(
            (item): item is NonNullable<typeof item> => item !== null
          ),
    vodUrl: stringOr(raw.vodUrl, fallbackCopy.vodUrl || ''),
  };

  return { ...normalized, streamTimestamps: getFeaturedTimestamps(normalized) };
}

export function getViralHooks(campaign: CampaignConfig): string[] {
  const hooks = (campaign.viralHooks || []).filter((hook) => hook.trim()).slice(0, 3);
  while (hooks.length < 3) {
    hooks.push(DEFAULT_VIRAL_HOOKS[hooks.length]);
  }
  return hooks;
}

export function getCreatorName(campaign: CampaignConfig): string {
  return campaign.creatorName || campaign.brandName;
}

export function injectCreatorName(text: string, campaign: CampaignConfig): string {
  return text.replace(/\[Creator Name\]/gi, getCreatorName(campaign));
}

export function getCreatorHandle(campaign: CampaignConfig): string {
  const creatorName = getCreatorName(campaign);
  return (
    campaign.creatorHandle ||
    `@${creatorName.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'creator'}`
  );
}

export function getCreatorHashtags(campaign: CampaignConfig): string[] {
  return campaign.mandatoryHashtags && campaign.mandatoryHashtags.length > 0
    ? campaign.mandatoryHashtags
    : [
        `#${getCreatorName(campaign)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '') || 'creator'}`,
        '#clips',
      ];
}

export function interpolateCreatorTemplate(
  template: string,
  campaign: CampaignConfig
): string {
  const creatorName = getCreatorName(campaign);
  const replacements: Record<string, string> = {
    creatorname: creatorName,
    creatorhandle: getCreatorHandle(campaign),
    hashtags: getCreatorHashtags(campaign).join(' '),
    primaryhashtag: getCreatorHashtags(campaign)[0] || '#clips',
  };

  return template.replace(
    /\{\{\s*([\w]+)\s*\}\}|\{\s*([\w]+)\s*\}/g,
    (match, doubleKey?: string, singleKey?: string) =>
      replacements[(doubleKey || singleKey || match).toLowerCase()] ?? match
  );
}

export function buildCreatorCaption(
  campaign: CampaignConfig,
  hookIndex = 0
): string {
  const hooks = getViralHooks(campaign);
  const hook = interpolateCreatorTemplate(hooks[hookIndex] || hooks[0], campaign);
  const hashtags = getCreatorHashtags(campaign);
  const hasMandatoryTag = hashtags.some((tag) =>
    hook.toLowerCase().includes(tag.toLowerCase())
  );
  const suffix = hasMandatoryTag
    ? ` | Watch ${getCreatorHandle(campaign)} live!`
    : ` | Watch ${getCreatorHandle(campaign)} live! ${hashtags.join(' ')}`;

  return `${hook}${suffix}`.replace(/\s+/g, ' ').trim();
}
