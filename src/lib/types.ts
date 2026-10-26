export interface LandingConfig {
  telegramUrl: string;
  forwardUtms: boolean;
  photoUrl: string;
  modelName: string;
  badgeText: string;
  showBadge: boolean;
  buttonText: string;
  buttonSubtext: string;
  showButtonSubtext: boolean;
  themePreset: "telegram-blue" | "rose-hot" | "emerald" | "amber-gold" | "custom";
  buttonBgColor: string;
  buttonTextColor: string;
  buttonGlow: boolean;
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
  region: string;
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

export interface DatabaseSchema {
  config: LandingConfig;
  visits: VisitEvent[];
}
