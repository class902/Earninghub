import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSettings } from '@/lib/api';
import type { SocialLink, GlobalActionButton, StatusCTAConfig, StatusLabelsConfig, StatusHistoryMode, PayoutConfig, DashboardCustom, UIButtonConfig, UIHeroConfig, UITickerConfig, UIOfferGridConfig, UIBrandConfig, UIActiveOffersConfig } from '@/types';
import { DEFAULT_GLOBAL_ACTION_BUTTONS, DEFAULT_STATUS_CTA_CONFIG, DEFAULT_STATUS_LABELS, DEFAULT_PAYOUT_CONFIG, DEFAULT_DASHBOARD_CUSTOM, DEFAULT_UI_BUTTONS, DEFAULT_UI_HERO, DEFAULT_UI_TICKER, DEFAULT_UI_OFFER_GRID, DEFAULT_UI_BRAND, DEFAULT_UI_ACTIVE_OFFERS } from '@/types';

// ── Theme utilities (exported for use in SettingsPage live preview) ──────────

export function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function applyThemeFromHex(hex: string, radius = 0.75) {
  if (!hex || hex.length < 4) return;
  try {
    const [h, s, l] = hexToHsl(hex);
    const lightL = Math.max(Math.min(l - 4, 65), 38);
    const darkL  = Math.min(l + 8, 72);
    const fgDark  = l > 55 ? `222 47% 4%`  : `0 0% 100%`;
    const fgLight = l > 55 ? `0 0% 100%`   : `0 0% 100%`;

    let style = document.getElementById('eh-dynamic-theme') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = 'eh-dynamic-theme';
      document.head.appendChild(style);
    }
    style.textContent = `
      :root {
        --primary: ${h} ${s}% ${lightL}%;
        --primary-foreground: ${fgLight};
        --ring: ${h} ${s}% ${lightL}%;
        --chart-1: ${h} ${s}% ${lightL}%;
        --sidebar-primary: ${h} ${s}% ${lightL}%;
        --sidebar-ring: ${h} ${s}% ${lightL}%;
        --radius: ${radius}rem;
      }
      .dark {
        --primary: ${h} ${s}% ${darkL}%;
        --primary-foreground: ${fgDark};
        --ring: ${h} ${s}% ${darkL}%;
        --chart-1: ${h} ${s}% ${darkL}%;
        --sidebar-primary: ${h} ${s}% ${darkL}%;
        --sidebar-ring: ${h} ${s}% ${darkL}%;
      }
    `;
  } catch {}
}

export function clearDynamicTheme() {
  const style = document.getElementById('eh-dynamic-theme');
  if (style) style.remove();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppSettings {
  webLogoUrl: string;
  socialLinks: SocialLink[];
  telegramLink: string;
  supportEmail: string;
  promoEnabled: boolean;
  promoBannerUrl: string;
  promoTitle: string;
  promoSubtitle: string;
  promoButtonText: string;
  promoOfferLink: string;
  promoRedirectLink: string;
  promoCashbackFormEnabled: boolean;
  googleFormUrl: string;
  googleFormLabel: string;
  googleFormEnabled: boolean;
  wifiWarningBannerUrl: string;
  leadFieldsConfig: string;
  referralEnabled: boolean;
  referralBonusYou: number;
  referralBonusFriend: number;
  referralTerms: string;
  referralMinOffers: number;
  globalActionButtons: GlobalActionButton[];
  trackByUpi: boolean;
  trackByName: boolean;
  statusCtaConfig: StatusCTAConfig;
  statusLabels: StatusLabelsConfig;
  showStatusHistoryDefault: boolean;
  statusHistoryMode: StatusHistoryMode;
  leadTrackDefaultFilter: '24h' | '7d';
  payoutConfig: PayoutConfig;
  dashboardCustom: DashboardCustom;
  // Brand & Design
  siteName: string;
  faviconUrl: string;
  themeConfig: string;
  layoutConfig: string;
  // Extended
  seoTitle: string;
  seoDescription: string;
  gaId: string;
  fontFamily: string;
  tickerText: string;
  customDomain: string;
  // Promo timing
  promoDelay: number;
  promoAutoClose: number;
  // God-Mode UI Button Configs
  uiButtons: UIButtonConfig[];
  // God-Mode expanded configs
  uiBrand: UIBrandConfig;
  uiHero: UIHeroConfig;
  uiTicker: UITickerConfig;
  uiOfferGrid: UIOfferGridConfig;
  uiActiveOffers: UIActiveOffersConfig;
}

interface AppContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  settings: AppSettings | null;
  settingsLoaded: boolean;
  reloadSettings: () => void;
}

// Read cached siteName from localStorage to prevent name-flash on page load
function getCachedSiteName(): string {
  try { return localStorage.getItem('eh_site_name_cache') || ''; } catch { return ''; }
}

const defaultSettings: AppSettings = {
  webLogoUrl: '',
  socialLinks: [],
  telegramLink: '',
  supportEmail: '',
  promoEnabled: false,
  promoBannerUrl: '',
  promoTitle: '',
  promoSubtitle: '',
  promoButtonText: 'Claim Now →',
  promoOfferLink: '',
  promoRedirectLink: '',
  promoCashbackFormEnabled: false,
  googleFormUrl: '',
  googleFormLabel: 'Apply Now',
  googleFormEnabled: false,
  wifiWarningBannerUrl: '',
  leadFieldsConfig: '',
  referralEnabled: false,
  referralBonusYou: 50,
  referralBonusFriend: 25,
  referralTerms: '',
  referralMinOffers: 1,
  globalActionButtons: DEFAULT_GLOBAL_ACTION_BUTTONS,
  trackByUpi: true,
  trackByName: true,
  statusCtaConfig: DEFAULT_STATUS_CTA_CONFIG,
  statusLabels: DEFAULT_STATUS_LABELS,
  showStatusHistoryDefault: true,
  statusHistoryMode: 'show' as StatusHistoryMode,
  leadTrackDefaultFilter: '7d' as const,
  payoutConfig: DEFAULT_PAYOUT_CONFIG,
  dashboardCustom: DEFAULT_DASHBOARD_CUSTOM,
  // Pre-populate siteName from cache to prevent flash of wrong/empty name on page load
  siteName: getCachedSiteName(),
  faviconUrl: '',
  themeConfig: '{}',
  layoutConfig: '{}',
  seoTitle: '',
  seoDescription: '',
  gaId: '',
  fontFamily: '',
  tickerText: '',
  customDomain: '',
  promoDelay: 3,
  promoAutoClose: 0,
  uiButtons: DEFAULT_UI_BUTTONS,
  uiBrand: DEFAULT_UI_BRAND,
  uiHero: DEFAULT_UI_HERO,
  uiTicker: DEFAULT_UI_TICKER,
  uiOfferGrid: DEFAULT_UI_OFFER_GRID,
  uiActiveOffers: DEFAULT_UI_ACTIVE_OFFERS,
};

const AppContext = createContext<AppContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  settings: null,
  settingsLoaded: false,
  reloadSettings: () => {},
});

function applyThemeModeFromConfig(mode: 'dark' | 'light' | 'system') {
  let isDark = mode === 'dark';
  if (mode === 'system') {
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }
  return isDark ? 'dark' as const : 'light' as const;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('eh_theme');
      return stored === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Initialize with defaultSettings (which has cached siteName) to avoid brand-name flash
  const [settings, setSettings] = useState<AppSettings | null>(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    try { localStorage.setItem('eh_theme', theme); } catch {}
  }, [theme]);

  // Re-apply theme colors when switching light/dark
  useEffect(() => {
    if (!settings?.themeConfig) return;
    try {
      const tc = JSON.parse(settings.themeConfig);
      if (tc.primaryHex) applyThemeFromHex(tc.primaryHex, tc.radius ?? 0.75);
    } catch {}
  }, [theme, settings?.themeConfig]);

  const loadSettings = useCallback(async () => {
    try {
      const s = await getSettings({});
      let socialLinks: SocialLink[] = [];
      try {
        if (s.socialLinksJson) socialLinks = JSON.parse(s.socialLinksJson);
      } catch {}
      let globalActionButtons: GlobalActionButton[] = DEFAULT_GLOBAL_ACTION_BUTTONS;
      try {
        if (s.globalActionButtonsJson) {
          const parsed = JSON.parse(s.globalActionButtonsJson);
          if (Array.isArray(parsed) && parsed.length > 0) globalActionButtons = parsed;
        }
      } catch {}
      let statusCtaConfig: StatusCTAConfig = DEFAULT_STATUS_CTA_CONFIG;
      try {
        if (s.statusCtaConfigJson) {
          const parsed = JSON.parse(s.statusCtaConfigJson);
          // Deep merge each status entry so partial overrides work
          statusCtaConfig = {
            pending: { ...DEFAULT_STATUS_CTA_CONFIG.pending, ...parsed.pending },
            onHold: { ...DEFAULT_STATUS_CTA_CONFIG.onHold, ...parsed.onHold },
            approved: { ...DEFAULT_STATUS_CTA_CONFIG.approved, ...parsed.approved },
            cashbackSent: { ...DEFAULT_STATUS_CTA_CONFIG.cashbackSent, ...parsed.cashbackSent },
            missing: { ...DEFAULT_STATUS_CTA_CONFIG.missing, ...parsed.missing, ...(parsed.rejected || {}) },
            custom: { ...DEFAULT_STATUS_CTA_CONFIG.custom, ...parsed.custom },
          };
          // Legacy migration: if old keys exist, map them
          if (parsed.incomplete && !parsed.pending) statusCtaConfig.pending = { ...statusCtaConfig.pending, ...parsed.incomplete };
          if (parsed.review && !parsed.pending) statusCtaConfig.pending = { ...statusCtaConfig.pending, ...parsed.review };
          if (parsed.hold && !parsed.onHold) statusCtaConfig.onHold = { ...statusCtaConfig.onHold, ...parsed.hold };
          if (parsed.paid && !parsed.cashbackSent) statusCtaConfig.cashbackSent = { ...statusCtaConfig.cashbackSent, ...parsed.paid };
        }
      } catch {}
      let statusLabels: StatusLabelsConfig = DEFAULT_STATUS_LABELS;
      try { if (s.statusLabelsJson) statusLabels = { ...DEFAULT_STATUS_LABELS, ...JSON.parse(s.statusLabelsJson) }; } catch {}

      let payoutConfig: PayoutConfig = DEFAULT_PAYOUT_CONFIG;
      try { if ((s as { payoutConfigJson?: string }).payoutConfigJson) payoutConfig = { ...DEFAULT_PAYOUT_CONFIG, ...JSON.parse((s as { payoutConfigJson?: string }).payoutConfigJson!) }; } catch {}

      let dashboardCustom: DashboardCustom = DEFAULT_DASHBOARD_CUSTOM;
      try { if ((s as { dashboardCustomJson?: string }).dashboardCustomJson) dashboardCustom = { ...DEFAULT_DASHBOARD_CUSTOM, ...JSON.parse((s as { dashboardCustomJson?: string }).dashboardCustomJson!) }; } catch {}

      let uiButtons: UIButtonConfig[] = DEFAULT_UI_BUTTONS;
      let uiBrand: UIBrandConfig = DEFAULT_UI_BRAND;
      let uiHero: UIHeroConfig = DEFAULT_UI_HERO;
      let uiTicker: UITickerConfig = DEFAULT_UI_TICKER;
      let uiOfferGrid: UIOfferGridConfig = DEFAULT_UI_OFFER_GRID;
      let uiActiveOffers: UIActiveOffersConfig = DEFAULT_UI_ACTIVE_OFFERS;
      try {
        const uiCfg = s.uiConfigJson ? JSON.parse(s.uiConfigJson) : {};
        if (uiCfg.buttons && Array.isArray(uiCfg.buttons) && uiCfg.buttons.length > 0) {
          // Merge with defaults so new buttons added later still appear
          const saved: UIButtonConfig[] = uiCfg.buttons;
          const merged = DEFAULT_UI_BUTTONS.map(def => saved.find(b => b.id === def.id) ?? def);
          const extra = saved.filter(b => !DEFAULT_UI_BUTTONS.find(d => d.id === b.id));
          uiButtons = [...merged, ...extra];
        }
        if (uiCfg.brand) uiBrand = { ...DEFAULT_UI_BRAND, ...uiCfg.brand };
        if (uiCfg.hero) uiHero = { ...DEFAULT_UI_HERO, ...uiCfg.hero, trustPills: uiCfg.hero.trustPills?.length ? uiCfg.hero.trustPills : DEFAULT_UI_HERO.trustPills };
        if (uiCfg.ticker) uiTicker = { ...DEFAULT_UI_TICKER, ...uiCfg.ticker };
        if (uiCfg.offerGrid) uiOfferGrid = { ...DEFAULT_UI_OFFER_GRID, ...uiCfg.offerGrid };
        if (uiCfg.activeOffers) uiActiveOffers = { ...DEFAULT_UI_ACTIVE_OFFERS, ...uiCfg.activeOffers };
      } catch {}

      const rawHistoryMode = (s as { statusHistoryMode?: string }).statusHistoryMode || '';
      const statusHistoryMode: StatusHistoryMode = (rawHistoryMode === 'hidden' ? 'hidden' : rawHistoryMode === 'collapsed' ? 'collapsed' : 'show');

      setSettings({
        ...defaultSettings,
        ...s,
        socialLinks,
        promoButtonText: s.promoButtonText || 'Claim Now →',
        referralEnabled: Boolean(s.referralEnabled),
        referralBonusYou: s.referralBonusYou ?? 50,
        referralBonusFriend: s.referralBonusFriend ?? 25,
        referralTerms: s.referralTerms || '',
        referralMinOffers: s.referralMinOffers ?? 1,
        globalActionButtons,
        trackByUpi: s.trackByUpi ?? true,
        trackByName: s.trackByName ?? true,
        statusCtaConfig,
        statusLabels,
        showStatusHistoryDefault: statusHistoryMode === 'show',
        statusHistoryMode,
        leadTrackDefaultFilter: ((s as { leadTrackDefaultFilter?: string }).leadTrackDefaultFilter === '24h' ? '24h' : '7d') as '24h' | '7d',
        payoutConfig,
        dashboardCustom,
        uiButtons,
        uiBrand,
        uiHero,
        uiTicker,
        uiOfferGrid,
        uiActiveOffers,
        siteName: s.siteName || '',
        faviconUrl: s.faviconUrl || '',
        themeConfig: s.themeConfig || '{}',
        layoutConfig: s.layoutConfig || '{}',
        seoTitle: s.seoTitle || '',
        seoDescription: s.seoDescription || '',
        gaId: s.gaId || '',
        fontFamily: s.fontFamily || '',
        tickerText: s.tickerText || '',
        customDomain: s.customDomain || '',
        promoDelay: typeof (s as { promoDelay?: number }).promoDelay === 'number' ? (s as { promoDelay?: number }).promoDelay! : 3,
        promoAutoClose: typeof (s as { promoAutoClose?: number }).promoAutoClose === 'number' ? (s as { promoAutoClose?: number }).promoAutoClose! : 0,
      });

      // Apply dynamic theme colors
      try {
        const tc = JSON.parse(s.themeConfig || '{}');
        if (tc.primaryHex) applyThemeFromHex(tc.primaryHex, tc.radius ?? 0.75);
        // Apply admin-controlled theme mode
        if (tc.themeMode) {
          const resolved = applyThemeModeFromConfig(tc.themeMode);
          setTheme(resolved);
        }
      } catch {}

      // Cache siteName in localStorage so next page load shows correct name immediately (no flash)
      try {
        if (s.siteName) localStorage.setItem('eh_site_name_cache', s.siteName);
      } catch {}

      // Apply SEO title
      if (s.seoTitle) {
        document.title = s.seoTitle;
      } else if (s.siteName) {
        document.title = s.siteName;
      }

      // Apply meta description
      if (s.seoDescription) {
        let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'description';
          document.head.appendChild(meta);
        }
        meta.content = s.seoDescription;
      }

      // Apply Google Analytics
      if (s.gaId && s.gaId.startsWith('G-')) {
        const existing = document.getElementById('eh-ga-script');
        if (!existing) {
          const script = document.createElement('script');
          script.id = 'eh-ga-script';
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${s.gaId}`;
          document.head.appendChild(script);
          const init = document.createElement('script');
          init.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${s.gaId}');`;
          document.head.appendChild(init);
        }
      }

      // Apply custom font family
      if (s.fontFamily) {
        document.documentElement.style.setProperty('--font-sans', s.fontFamily);
      }

      // Apply custom favicon
      if (s.faviconUrl) {
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = s.faviconUrl;
      }
    } catch {
      setSettings(defaultSettings);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function toggleTheme() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, settings, settingsLoaded, reloadSettings: loadSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
