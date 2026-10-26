export interface LandingConfig {
  telegramUrl: string;
  forwardUtms: boolean;
  photoUrl: string;
  savedPhotos: string[]; // Histórico de fotos salvas para troca rápida em 1 clique
  modelName: string;
  badgeText: string;
  showBadge: boolean;
  hookHeadline: string; // Copy / Hook principal (ex: "Ela está te esperando no Telegram...")
  showHookHeadline: boolean;
  urgencyBadge: string; // Prova social / escassez (ex: "🔥 142 pessoas online agora")
  showUrgencyBadge: boolean;
  buttonText: string;
  buttonSubtext: string;
  showButtonSubtext: boolean;
  ctaIcon: "telegram" | "fire" | "lock" | "heart" | "bolt" | "star";
  themePreset: "telegram-blue" | "rose-hot" | "emerald" | "amber-gold" | "custom";
  buttonBgColor: string;
  buttonTextColor: string;
  buttonGlow: boolean;
  overlayStyle: "cinematic" | "heavy" | "clean";
  footerDisclaimer: string;
  showFooterDisclaimer: boolean;
  showAdminShortcut: boolean;
  adminPassword: string;
  facebookPixelId?: string;
  googleAnalyticsId?: string;
  tiktokPixelId?: string;
  updatedAt: string;
}

export interface VisitEvent {
  id: string;
  timestamp: string; // ISO format
  ip: string;
  country: string;
  countryCode: string;
  region: string; // Estado / UF normalizado
  city: string;
  device: "Mobile" | "Desktop" | "Tablet";
  os: string;
  browser: string;
  isInAppBrowser: boolean;
  inAppName?: string;
  userAgent: string;
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  extraParams?: Record<string, string>;
  clicked: boolean;
  clickedAt?: string;
}

export interface BrazilStateStat {
  uf: string;
  name: string;
  visits: number;
  clicks: number;
  cr: number;
}

export interface DatabaseSchema {
  config: LandingConfig;
  visits: VisitEvent[];
}
