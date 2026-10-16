import { appOrigin } from '@/lib/appUrl';
import { useEffect, useState } from 'react';
import { adminSaveSettings, getSettings } from 'zitejs/api';
import { toast } from 'sonner';
import { Plus, Trash2, Save, RefreshCw, Globe, Copy, ExternalLink, Mail, Edit3, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import type { LeadFieldDef, SocialLink, GlobalActionButton, StatusCTAConfig, CustomCTAEntry } from '@/types';
import { DEFAULT_LEAD_FIELDS, DEFAULT_GLOBAL_ACTION_BUTTONS, DEFAULT_STATUS_CTA_CONFIG, DEFAULT_STATUS_CTA_V2 } from '@/types';
import LeadFieldsConfig from './LeadFieldsConfig';
import ImageUploadField from './ImageUploadField';
import AdminCredentials from './AdminCredentials';
import { useAppContext, applyThemeFromHex, clearDynamicTheme } from '@/contexts/AppContext';

interface Props { password: string }

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${value ? 'bg-primary' : 'bg-border'}`}>
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  );
}

const BUTTON_TYPE_ICONS: Record<string, string> = { complete_offer: '✅', submit_form: '📝', contact_us: '🎧' };
const BUTTON_TYPE_LABELS: Record<string, string> = { complete_offer: 'Complete Offer', submit_form: 'Submit Form', contact_us: 'Contact Us' };

// ── 8 Clean Tabs ─────────────────────────────────────────────────────────────
const TABS = [
  { value: 'web',       icon: '🌐', label: 'SEO & Web' },
  { value: 'marketing', icon: '📢', label: 'Marketing' },
  { value: 'leads',     icon: '📋', label: 'Leads & Track' },
  { value: 'payouts',   icon: '💰', label: 'Payouts & CTA' },
  { value: 'community', icon: '🤝', label: 'Community' },
  { value: 'security',  icon: '🔐', label: 'Security' },
];

const THEME_PRESETS = [
  { name: 'Blue',    hex: '#3b82f6' }, { name: 'Indigo',   hex: '#6366f1' },
  { name: 'Purple',  hex: '#8b5cf6' }, { name: 'Pink',     hex: '#ec4899' },
  { name: 'Red',     hex: '#ef4444' }, { name: 'Orange',   hex: '#f97316' },
  { name: 'Gold',    hex: '#f59e0b' }, { name: 'Green',    hex: '#22c55e' },
  { name: 'Emerald', hex: '#10b981' }, { name: 'Teal',     hex: '#14b8a6' },
  { name: 'Cyan',    hex: '#06b6d4' }, { name: 'Sky',      hex: '#0ea5e9' },
];

const FONT_PRESETS = [
  { label: 'System Default',  value: '' },
  { label: 'Inter (Modern)',  value: 'Inter, sans-serif' },
  { label: 'Poppins (Rounded)', value: 'Poppins, sans-serif' },
  { label: 'DM Sans (Clean)', value: 'DM Sans, sans-serif' },
  { label: 'Nunito (Friendly)', value: 'Nunito, sans-serif' },
  { label: 'Rajdhani (Tech)', value: 'Rajdhani, sans-serif' },
  { label: 'Manrope (Pro)',   value: 'Manrope, sans-serif' },
];

type SiteLinkItem = { id: string; icon: string; label: string; path: string; desc: string };

const DEFAULT_SITE_LINKS: SiteLinkItem[] = [
  { id: 'home',       icon: '🏠', label: 'Home',                    path: '/',                            desc: 'Main homepage with all offers' },
  { id: 'admin',      icon: '⚙️', label: 'Admin Panel',             path: '/admin-boss',                       desc: 'Admin login & dashboard' },
  { id: 'track',      icon: '🔍', label: 'Lead Tracker',            path: '/user-lead-track',             desc: 'User lead tracking page' },
  { id: 'offer-ex',   icon: '📦', label: 'Offer Page (example)',    path: '/your-offer-name',             desc: 'Each offer gets its own URL slug' },
  { id: 'private-ex', icon: '🔒', label: 'Private Campaign',        path: '/exclusive/your-slug',         desc: 'Private campaign page' },
  { id: 'offer-track',icon: '📊', label: 'Offer Tracker (example)', path: '/your-offer/user-lead-track',  desc: 'Offer-specific tracking page' },
];

function SectionCard({ icon, title, desc, children }: { icon: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-syne font-black text-foreground text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">{label}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

export default function SettingsPage({ password }: Props) {
  const { reloadSettings } = useAppContext();
  const inp = 'w-full px-4 py-3 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors font-satoshi';
  const lbl = 'text-xs font-black text-muted-foreground uppercase tracking-wider mb-2 block';

  // ── Brand ──────────────────────────────────────────────────────────────────
  const [siteName, setSiteName]         = useState('');
  const [faviconUrl, setFaviconUrl]     = useState('');
  const [webLogoUrl, setWebLogoUrl]     = useState('');
  const [primaryHex, setPrimaryHex]     = useState('#3b82f6');
  const [radiusValue, setRadiusValue]   = useState(0.75);
  const [themeMode, setThemeMode]       = useState<'dark' | 'light' | 'system'>('dark');
  const [fontFamily, setFontFamily]     = useState('');

  // ── Homepage ───────────────────────────────────────────────────────────────
  const [offerColumns, setOfferColumns]         = useState<'2'|'3'|'4'>('3');
  const [showHero, setShowHero]                 = useState(true);
  const [showTicker, setShowTicker]             = useState(true);
  const [tickerText, setTickerText]             = useState('');
  const [offerCategories, setOfferCategories]   = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // ── SEO & Web ──────────────────────────────────────────────────────────────
  const [seoTitle, setSeoTitle]           = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [gaId, setGaId]                   = useState('');
  const [customDomain, setCustomDomain]   = useState('');
  const [siteLinksCustom, setSiteLinksCustom] = useState<SiteLinkItem[]>(DEFAULT_SITE_LINKS);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

  // ── Marketing ──────────────────────────────────────────────────────────────
  const [googleFormEnabled, setGoogleFormEnabled]           = useState(false);
  const [googleFormLabel, setGoogleFormLabel]               = useState('Apply Now');
  const [googleFormUrl, setGoogleFormUrl]                   = useState('');
  const [promoEnabled, setPromoEnabled]                     = useState(false);
  const [promoBannerUrl, setPromoBannerUrl]                 = useState('');
  const [promoTitle, setPromoTitle]                         = useState('');
  const [promoSubtitle, setPromoSubtitle]                   = useState('');
  const [promoButtonText, setPromoButtonText]               = useState('Claim Now →');
  const [promoOfferLink, setPromoOfferLink]                 = useState('');
  const [promoRedirectLink, setPromoRedirectLink]           = useState('');
  const [promoCashbackFormEnabled, setPromoCashbackFormEnabled] = useState(false);
  const [promoDelay, setPromoDelay]                         = useState(3);
  const [promoAutoClose, setPromoAutoClose]                 = useState(0);
  const [wifiWarningBannerUrl, setWifiWarningBannerUrl]     = useState('');

  // ── Leads & Track ──────────────────────────────────────────────────────────
  const [leadFields, setLeadFields]         = useState<LeadFieldDef[]>(DEFAULT_LEAD_FIELDS);
  const [globalButtons, setGlobalButtons]   = useState<GlobalActionButton[]>(DEFAULT_GLOBAL_ACTION_BUTTONS);
  const [statusHistoryMode, setStatusHistoryMode]           = useState<'show'|'collapsed'|'hidden'>('show');
  const [leadTrackDefaultFilter, setLeadTrackDefaultFilter] = useState<'24h'|'7d'>('7d');

  // ── Payouts & CTA ──────────────────────────────────────────────────────────
  const [statusCtaConfig, setStatusCtaConfig] = useState<StatusCTAConfig>(DEFAULT_STATUS_CTA_V2);
  const [globalUserFacingEnabled, setGlobalUserFacingEnabled] = useState(true);
  const [payoutEarningLabel, setPayoutEarningLabel]   = useState('Admin Cut');
  const [payoutUserLabel, setPayoutUserLabel]         = useState('Estimate User');
  const [payoutSendLabel, setPayoutSendLabel]         = useState('User Got');
  const [showUserPayoutInTracker, setShowUserPayoutInTracker] = useState(false);
  const [showSendAmountInTracker, setShowSendAmountInTracker] = useState(false);
  const [statusLabels, setStatusLabels]               = useState<Record<string, string>>({});
  const [customCustomerTypes, setCustomCustomerTypes] = useState<string[]>([]);
  const [customAppSources, setCustomAppSources]       = useState<string[]>([]);
  const [newCustomerType, setNewCustomerType]         = useState('');
  const [newAppSource, setNewAppSource]               = useState('');
  const [dashShowMyEarnings, setDashShowMyEarnings]       = useState(true);
  const [dashShowUserPayoutTotal, setDashShowUserPayoutTotal] = useState(true);
  const [dashShowSendUserTotal, setDashShowSendUserTotal] = useState(true);
  const [dashShowPendingPayouts, setDashShowPendingPayouts] = useState(true);
  const [dashShowConversionRate, setDashShowConversionRate] = useState(true);
  const [dashShowFraudAlerts, setDashShowFraudAlerts]     = useState(true);
  const [dashShowTodayLeads, setDashShowTodayLeads]       = useState(true);

  // ── Community ──────────────────────────────────────────────────────────────
  const [socialLinks, setSocialLinks]       = useState<SocialLink[]>([]);
  const [telegramLink, setTelegramLink]     = useState('');
  const [supportEmail, setSupportEmail]     = useState('');
  const [whatsappLink, setWhatsappLink]     = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [referralEnabled, setReferralEnabled]   = useState(false);
  const [referralBonusYou, setReferralBonusYou] = useState(50);
  const [referralBonusFriend, setReferralBonusFriend] = useState(25);
  const [referralTerms, setReferralTerms]       = useState('');
  const [referralMinOffers, setReferralMinOffers] = useState(1);

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // ── Apply theme live ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading) applyThemeFromHex(primaryHex, radiusValue);
  }, [primaryHex, radiusValue, loading]);

  // ── Load settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    getSettings({}).then(s => {
      setSiteName(s.siteName || '');
      setFaviconUrl(s.faviconUrl || '');
      setWebLogoUrl(s.webLogoUrl || '');
      try { const tc = JSON.parse(s.themeConfig || '{}'); if (tc.primaryHex) setPrimaryHex(tc.primaryHex); if (typeof tc.radius === 'number') setRadiusValue(tc.radius); if (tc.themeMode) setThemeMode(tc.themeMode); } catch {}
      try { const lc = JSON.parse(s.layoutConfig || '{}'); if (lc.offerColumns) setOfferColumns(lc.offerColumns as '2'|'3'|'4'); if (lc.showHero !== undefined) setShowHero(lc.showHero); if (lc.showTicker !== undefined) setShowTicker(lc.showTicker); if (Array.isArray(lc.offerCategories)) setOfferCategories(lc.offerCategories); } catch {}
      setFontFamily(s.fontFamily || '');
      setTickerText(s.tickerText || '');
      setSeoTitle(s.seoTitle || '');
      setSeoDescription(s.seoDescription || '');
      setGaId(s.gaId || '');
      setCustomDomain(s.customDomain || '');
      try { const sl = JSON.parse((s as { siteLinksCustomJson?: string }).siteLinksCustomJson || '[]'); if (Array.isArray(sl) && sl.length > 0) setSiteLinksCustom(sl); } catch {}
      setGoogleFormEnabled(s.googleFormEnabled || false);
      setGoogleFormLabel(s.googleFormLabel || 'Apply Now');
      setGoogleFormUrl(s.googleFormUrl || '');
      setPromoEnabled(s.promoEnabled || false);
      setPromoBannerUrl(s.promoBannerUrl || '');
      setPromoTitle(s.promoTitle || '');
      setPromoSubtitle(s.promoSubtitle || '');
      setPromoButtonText(s.promoButtonText || 'Claim Now →');
      setPromoOfferLink(s.promoOfferLink || '');
      setPromoRedirectLink(s.promoRedirectLink || '');
      setPromoCashbackFormEnabled(s.promoCashbackFormEnabled || false);
      setPromoDelay(typeof (s as { promoDelay?: number }).promoDelay === 'number' ? (s as { promoDelay?: number }).promoDelay! : 3);
      setPromoAutoClose(typeof (s as { promoAutoClose?: number }).promoAutoClose === 'number' ? (s as { promoAutoClose?: number }).promoAutoClose! : 0);
      setWifiWarningBannerUrl(s.wifiWarningBannerUrl || '');
      if (s.leadFieldsConfig) { try {
        const p = JSON.parse(s.leadFieldsConfig) as LeadFieldDef[];
        if (Array.isArray(p) && p.length > 0) {
          // Migrate: if no field has searchable defined, derive from legacy trackBy* settings
          const hasSearchableProp = p.some(f => typeof f.searchable === 'boolean');
          if (!hasSearchableProp) {
            const tUpi = s.trackByUpi ?? true;
            const tName = s.trackByName ?? true;
            const tMobile = (s as { trackByMobile?: boolean }).trackByMobile ?? true;
            const tEmail = (s as { trackByEmail?: boolean }).trackByEmail ?? false;
            p.forEach(f => {
              const l = f.label.toLowerCase();
              if (l.includes('upi')) f.searchable = tUpi;
              else if (l.includes('name')) f.searchable = tName;
              else if (l.includes('mobile') || l.includes('phone') || f.type === 'tel') f.searchable = tMobile;
              else if (l.includes('email') || f.type === 'email') f.searchable = tEmail;
              else f.searchable = false;
            });
          }
          setLeadFields(p);
        }
      } catch {} }
      try { const btns = JSON.parse(s.globalActionButtonsJson || '[]'); if (Array.isArray(btns) && btns.length > 0) setGlobalButtons(btns); } catch {}
      const rawMode = (s as { statusHistoryMode?: string }).statusHistoryMode || '';
      setStatusHistoryMode((rawMode === 'hidden' ? 'hidden' : rawMode === 'collapsed' ? 'collapsed' : 'show') as 'show'|'collapsed'|'hidden');
      setLeadTrackDefaultFilter(((s as { leadTrackDefaultFilter?: string }).leadTrackDefaultFilter === '24h' ? '24h' : '7d') as '24h'|'7d');
      try { const ctaCfg = JSON.parse(s.statusCtaConfigJson || '{}');
        const merged: StatusCTAConfig = {
          pending: { ...DEFAULT_STATUS_CTA_V2.pending, ...ctaCfg.pending, ...(ctaCfg.incomplete && !ctaCfg.pending ? ctaCfg.incomplete : {}), ...(ctaCfg.review && !ctaCfg.pending ? ctaCfg.review : {}) },
          onHold: { ...DEFAULT_STATUS_CTA_V2.onHold, ...ctaCfg.onHold, ...(ctaCfg.hold && !ctaCfg.onHold ? ctaCfg.hold : {}) },
          approved: { ...DEFAULT_STATUS_CTA_V2.approved, ...ctaCfg.approved },
          cashbackSent: { ...DEFAULT_STATUS_CTA_V2.cashbackSent, ...ctaCfg.cashbackSent, ...(ctaCfg.paid && !ctaCfg.cashbackSent ? ctaCfg.paid : {}) },
          missing: { ...DEFAULT_STATUS_CTA_V2.missing, ...ctaCfg.missing, ...(ctaCfg.rejected && !ctaCfg.missing ? ctaCfg.rejected : {}) },
          custom: { ...DEFAULT_STATUS_CTA_V2.custom, ...ctaCfg.custom },
        };
        setStatusCtaConfig(merged);
      } catch {}
      try {
        const pc = JSON.parse((s as { payoutConfigJson?: string }).payoutConfigJson || '{}');
        if (pc.earningLabel) setPayoutEarningLabel(pc.earningLabel);
        if (pc.userPayoutLabel) setPayoutUserLabel(pc.userPayoutLabel);
        if (pc.sendUserLabel) setPayoutSendLabel(pc.sendUserLabel);
        if (typeof pc.showUserPayoutInTracker === 'boolean') setShowUserPayoutInTracker(pc.showUserPayoutInTracker);
        if (typeof pc.showSendAmountInTracker === 'boolean') setShowSendAmountInTracker(pc.showSendAmountInTracker);
        if (typeof pc.globalUserFacingEnabled === 'boolean') setGlobalUserFacingEnabled(pc.globalUserFacingEnabled);
      } catch {}
      try { setStatusLabels(JSON.parse((s as { statusLabelsJson?: string }).statusLabelsJson || '{}')); } catch { setStatusLabels({}); }
      try { const tagOpts = JSON.parse((s as { leadTagOptionsJson?: string }).leadTagOptionsJson || '{}'); if (Array.isArray(tagOpts.customCustomerTypes)) setCustomCustomerTypes(tagOpts.customCustomerTypes); if (Array.isArray(tagOpts.customAppSources)) setCustomAppSources(tagOpts.customAppSources); } catch {}
      try {
        const dc = JSON.parse((s as { dashboardCustomJson?: string }).dashboardCustomJson || '{}');
        if (typeof dc.showMyEarnings === 'boolean') setDashShowMyEarnings(dc.showMyEarnings);
        if (typeof dc.showUserPayoutTotal === 'boolean') setDashShowUserPayoutTotal(dc.showUserPayoutTotal);
        if (typeof dc.showSendUserTotal === 'boolean') setDashShowSendUserTotal(dc.showSendUserTotal);
        if (typeof dc.showPendingPayouts === 'boolean') setDashShowPendingPayouts(dc.showPendingPayouts);
        if (typeof dc.showConversionRate === 'boolean') setDashShowConversionRate(dc.showConversionRate);
        if (typeof dc.showFraudAlerts === 'boolean') setDashShowFraudAlerts(dc.showFraudAlerts);
        if (typeof dc.showTodayLeads === 'boolean') setDashShowTodayLeads(dc.showTodayLeads);
      } catch {}
      try { const p = JSON.parse(s.socialLinksJson || '[]'); setSocialLinks(Array.isArray(p) ? p : []); } catch { setSocialLinks([]); }
      setTelegramLink(s.telegramLink || '');
      setSupportEmail(s.supportEmail || '');
      setWhatsappLink((s as { whatsappLink?: string }).whatsappLink || '');
      setNotificationEmail((s as { notificationEmail?: string }).notificationEmail || '');
      setReferralEnabled(s.referralEnabled || false);
      setReferralBonusYou(s.referralBonusYou ?? 50);
      setReferralBonusFriend(s.referralBonusFriend ?? 25);
      setReferralTerms(s.referralTerms || '');
      setReferralMinOffers(s.referralMinOffers ?? 1);
    }).finally(() => setLoading(false));
  }, []);

  function updateButton(id: string, key: keyof GlobalActionButton, value: string | boolean) {
    setGlobalButtons(bs => bs.map(b => b.id === id ? { ...b, [key]: value } : b));
  }
  function addSocialLink() { setSocialLinks(l => [...l, { id: `sl_${Date.now()}`, name: '', url: '', iconUrl: '' }]); }
  function removeSocialLink(id: string) { setSocialLinks(l => l.filter(s => s.id !== id)); }
  function updateSocialLink(id: string, key: keyof SocialLink, value: string) {
    setSocialLinks(l => l.map(s => s.id === id ? { ...s, [key]: value } : s));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await adminSaveSettings({
        password,
        siteName, faviconUrl, webLogoUrl,
        themeConfig: JSON.stringify({ primaryHex, radius: radiusValue, themeMode }),
        layoutConfig: JSON.stringify({ offerColumns, showHero, showTicker, offerCategories }),
        fontFamily, tickerText,
        socialLinksJson: JSON.stringify(socialLinks),
        telegramLink, supportEmail,
        seoTitle, seoDescription, gaId, customDomain,
        siteLinksCustomJson: JSON.stringify(siteLinksCustom),
        googleFormUrl, googleFormLabel, googleFormEnabled,
        notificationEmail, whatsappLink,
        leadFieldsConfig: JSON.stringify(leadFields),
        wifiWarningBannerUrl,
        promoEnabled, promoBannerUrl, promoTitle, promoSubtitle, promoButtonText,
        promoOfferLink, promoRedirectLink, promoCashbackFormEnabled,
        promoDelay, promoAutoClose,
        referralEnabled, referralBonusYou, referralBonusFriend, referralTerms, referralMinOffers,
        globalActionButtonsJson: JSON.stringify(globalButtons),
        // Derive trackBy* from field-level 🔎 searchable toggles
        trackByUpi: leadFields.some(f => f.enabled && f.searchable && (f.id.includes('upi') || f.label.toLowerCase().includes('upi'))),
        trackByName: leadFields.some(f => f.enabled && f.searchable && (f.id.includes('name') || f.label.toLowerCase().includes('name'))),
        trackByMobile: leadFields.some(f => f.enabled && f.searchable && (f.type === 'tel' || f.id.includes('mobile') || f.label.toLowerCase().includes('mobile') || f.label.toLowerCase().includes('phone'))),
        trackByEmail: leadFields.some(f => f.enabled && f.searchable && (f.type === 'email' || f.label.toLowerCase().includes('email'))),
        statusCtaConfigJson: JSON.stringify(statusCtaConfig),
        statusLabelsJson: JSON.stringify(statusLabels),
        showStatusHistoryDefault: statusHistoryMode === 'show',
        statusHistoryMode,
        leadTrackDefaultFilter,
        payoutConfigJson: JSON.stringify({ earningLabel: payoutEarningLabel, userPayoutLabel: payoutUserLabel, sendUserLabel: payoutSendLabel, showUserPayoutInTracker, showSendAmountInTracker, globalUserFacingEnabled }),
        leadTagOptionsJson: JSON.stringify({ customCustomerTypes, customAppSources }),
        dashboardCustomJson: JSON.stringify({ showMyEarnings: dashShowMyEarnings, showUserPayoutTotal: dashShowUserPayoutTotal, showSendUserTotal: dashShowSendUserTotal, showPendingPayouts: dashShowPendingPayouts, showConversionRate: dashShowConversionRate, showFraudAlerts: dashShowFraudAlerts, showTodayLeads: dashShowTodayLeads }),
      });
      const savedTime = new Date(result.savedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      toast.success(`✅ Settings saved! v${result.configVersion} at ${savedTime}`);
      reloadSettings();
    } catch (e) {
      toast.error(String((e as { message?: string })?.message || '') || 'Failed to save settings.');
    } finally { setSaving(false); }
  }

  if (loading) return (
    <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl h-28 animate-pulse" />)}</div>
  );

  // Helper: build base URL for section links
  const base = customDomain ? `https://${customDomain.replace(/^https?:\/\//, '')}` : (typeof window !== 'undefined' ? appOrigin() : '');
  function getFullUrl(path: string) { return path.startsWith('http') ? path : `${base}${path}`; }
  function copyUrl(url: string) { navigator.clipboard.writeText(url).then(() => toast.success('Copied! 📋')).catch(() => toast.error('Copy failed')); }
  function handleCopyAll() {
    const all = siteLinksCustom.map(l => l.label + ': ' + getFullUrl(l.path)).join('\n');
    navigator.clipboard.writeText(all).then(() => toast.success('All links copied! 📋')).catch(() => toast.error('Copy failed'));
  }
  function handleEmailLinks() {
    const subject = encodeURIComponent((siteName || 'EarningHub') + ' - Site Links');
    const body = encodeURIComponent('Hi,\n\nHere are all my site links:\n\n' + siteLinksCustom.map(l => l.label + ': ' + getFullUrl(l.path)).join('\n') + '\n\nUpdated: ' + new Date().toLocaleString());
    window.open('mailto:gclass902@gmail.com?subject=' + subject + '&body=' + body, '_blank');
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-5">
      <Tabs defaultValue="web">
        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <div className="overflow-x-auto pb-2">
          <TabsList className="bg-card border border-border p-1 h-auto gap-0.5 inline-flex min-w-max w-full rounded-2xl">
            {TABS.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">
                <span className="text-sm leading-none">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>


        {/* Theme & Design — moved from former Brand tab */}
        <TabsContent value="web" className="space-y-5 mt-0">

          <SectionCard icon="🎨" title="Theme Colors" desc="Brand color applied to buttons, highlights & accents — live preview!">
            <div className="space-y-5">
              <div>
                <label className={lbl}>Quick Color Presets</label>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {THEME_PRESETS.map(p => (
                    <button key={p.hex} onClick={() => setPrimaryHex(p.hex)} title={p.name}
                      className={`relative h-9 rounded-xl border-2 transition-all hover:scale-110 ${primaryHex.toLowerCase() === p.hex.toLowerCase() ? 'border-white scale-110 shadow-lg ring-2 ring-offset-2 ring-offset-card' : 'border-transparent'}`}
                      style={{ backgroundColor: p.hex, ['--tw-ring-color' as string]: p.hex }}>
                      {primaryHex.toLowerCase() === p.hex.toLowerCase() && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className={lbl}>Custom Color (HEX)</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={primaryHex} onChange={e => setPrimaryHex(e.target.value)}
                      className="w-16 h-12 rounded-xl border-2 border-border cursor-pointer p-1 bg-card" />
                    <input value={primaryHex} onChange={e => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setPrimaryHex(v); }}
                      placeholder="#3b82f6" className="flex-1 px-3 py-2 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary font-mono" maxLength={7} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Preview</label>
                  <div className="h-12 rounded-xl flex items-center justify-center font-syne font-black text-sm text-white shadow-lg"
                    style={{ backgroundColor: primaryHex, boxShadow: `0 4px 20px ${primaryHex}55` }}>
                    Earn Cashback →
                  </div>
                </div>
              </div>
              <div>
                <label className={lbl}>Corner Roundness</label>
                <div className="flex items-center gap-4">
                  <input type="range" min="0" max="1.5" step="0.25" value={radiusValue}
                    onChange={e => setRadiusValue(Number(e.target.value))} className="flex-1 h-2 accent-primary cursor-pointer" />
                  <div className="w-10 h-10 flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-md"
                    style={{ borderRadius: `${radiusValue}rem`, backgroundColor: primaryHex }}>Aa</div>
                </div>
              </div>
              <button onClick={() => { setPrimaryHex('#3b82f6'); setRadiusValue(0.75); clearDynamicTheme(); }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-muted-foreground border border-border rounded-xl hover:border-primary hover:text-primary transition-all">
                <RefreshCw size={13} /> Reset Theme
              </button>
            </div>
          </SectionCard>

          <SectionCard icon="🌓" title="Theme Mode" desc="Dark/light mode for the site">
            <div className="grid grid-cols-3 gap-3">
              {([
                { v: 'dark' as const, icon: '🌑', label: 'Dark', active: 'border-primary bg-primary/10 text-primary' },
                { v: 'light' as const, icon: '☀️', label: 'Light', active: 'border-amber-500/60 bg-amber-500/10 text-amber-400' },
                { v: 'system' as const, icon: '🌓', label: 'System', active: 'border-violet-500/60 bg-violet-500/10 text-violet-400' },
              ] as const).map(opt => (
                <button key={opt.v} onClick={() => setThemeMode(opt.v)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${themeMode === opt.v ? opt.active : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}>
                  <p className="text-2xl mb-2">{opt.icon}</p>
                  <p className="text-xs font-black">{opt.label}</p>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon="🔤" title="Typography" desc="Body font for the site">
            <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className={inp}>
              {FONT_PRESETS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </SectionCard>

          <SectionCard icon="🌐" title="Custom Domain" desc="Your website's public domain — stored for reference and link generation">
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3">
                <Globe size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-blue-400">Domain Independence:</strong> Your content is stored in the database — not hardcoded. Change domains anytime without rebuilding.
                </p>
              </div>
              <div>
                <label className={lbl}>Custom Domain (reference)</label>
                <input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="e.g. earninghub.in" className={inp} />
                <p className="text-xs text-muted-foreground mt-1.5">To actually change your domain, update it in Zite editor → Settings → Domain.</p>
              </div>
            </div>
          </SectionCard>

          {/* ── AUTO-GENERATED SECTION LINKS ── */}
          <SectionCard icon="🔗" title="All Section & Page Links" desc="Every URL in your site — auto-generated with copy & open buttons. Template URLs show the pattern.">
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-black">📋 Quick Reference:</span> All your site's URLs in one place. Copy any link to share directly. Template URLs (🔶) show the pattern — replace <code className="text-amber-400 bg-amber-500/10 px-1 rounded">{'{name}'}</code> with the actual slugified value.
                </p>
              </div>
              {/* Auto-generated link groups */}
              {[
                {
                  cat: '🏠 Homepage Sections', color: 'blue',
                  links: [
                    { icon: '🏠', label: 'Home',           path: '/',                  desc: 'Main homepage', isTemplate: false },
                    { icon: '🎯', label: 'Live Offers',     path: '/#offers',           desc: 'Offer listing section (anchor)', isTemplate: false },
                    { icon: '💰', label: 'Cashback Forms',  path: '/#cashback-forms',   desc: 'Submit cashback section (anchor)', isTemplate: false },
                    { icon: '🤝', label: 'Refer & Earn',    path: '/#refer',            desc: 'Referral section (anchor, if enabled)', isTemplate: false },
                  ],
                },
                {
                  cat: '🔍 Tracking Pages', color: 'violet',
                  links: [
                    { icon: '🔍', label: 'Track Lead (All Offers)',    path: '/user-lead-track',               desc: 'Universal lead tracker page', isTemplate: false },
                    { icon: '📊', label: 'Offer-Specific Tracker',     path: '/{offer-name}/user-lead-track',  desc: 'Replace {offer-name} with slugified offer name', isTemplate: true },
                  ],
                },
                {
                  cat: '📦 Offer & Campaign Pages', color: 'amber',
                  links: [
                    { icon: '📦', label: 'Offer Page',         path: '/{offer-name}',        desc: 'Each offer gets its own URL (slugified name)', isTemplate: true },
                    { icon: '🔒', label: 'Private Campaign',   path: '/exclusive/{slug}',    desc: 'Private campaign with a custom slug', isTemplate: true },
                  ],
                },
                {
                  cat: '🔗 Referral Links', color: 'green',
                  links: [
                    { icon: '🔗', label: 'Referral Link',    path: '/refer/{code}',       desc: 'Unique referral link per user per offer — code auto-generated', isTemplate: true },
                    { icon: '📊', label: 'Referral Tracker', path: '/offereftrck/{code}', desc: 'Referrer dashboard — same {code} as the referral link above', isTemplate: true },
                  ],
                },
                {
                  cat: '⚙️ Admin Panel', color: 'red',
                  links: [
                    { icon: '⚙️', label: 'Admin Login & Dashboard', path: '/admin-boss', desc: 'Admin panel — password protected', isTemplate: false },
                  ],
                },
                ...(googleFormEnabled && googleFormUrl ? [{
                  cat: '📝 Your Custom Form', color: 'green',
                  links: [
                    { icon: '📝', label: googleFormLabel || 'Form', path: googleFormUrl, desc: 'Hero CTA form button link (admin-set)', isTemplate: false },
                  ],
                }] : []),
              ].map(group => (
                <div key={group.cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{group.cat}</p>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                  <div className="space-y-1.5">
                    {group.links.map(link => {
                      const fullUrl = getFullUrl(link.path);
                      return (
                        <div key={link.path} className="flex items-center gap-2.5 p-2.5 bg-background border border-border rounded-xl hover:border-primary/30 transition-colors">
                          <span className="text-base flex-shrink-0">{link.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-foreground">{link.label}</p>
                            <p className={`text-[10px] font-mono truncate ${link.isTemplate ? 'text-amber-400' : 'text-muted-foreground'}`}>
                              {link.isTemplate ? link.path : fullUrl}
                            </p>
                            <p className="text-[9px] text-muted-foreground/60 mt-0.5">{link.desc}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {link.isTemplate ? (
                              <span className="text-[9px] font-black text-amber-400 border border-amber-500/30 rounded-lg px-2 py-1">Template</span>
                            ) : (
                              <>
                                <button onClick={() => copyUrl(fullUrl)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-all" title="Copy"><Copy size={11} /></button>
                                <a href={fullUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-all" title="Open"><ExternalLink size={11} /></a>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <span className="text-sm flex-shrink-0">💡</span>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <strong className="text-amber-400">Slug format:</strong> Offer "Angel One Demat" → URL slug is <code className="text-foreground bg-card px-1 rounded">angel-one-demat</code>. So the offer page is <code className="text-foreground bg-card px-1 rounded">/angel-one-demat</code> and tracker is <code className="text-foreground bg-card px-1 rounded">/angel-one-demat/user-lead-track</code>.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* ── EDITABLE CUSTOM SITE LINKS ── */}
          <SectionCard icon="✏️" title="Editable Custom Links" desc="Add, edit & copy custom links — auto-downloaded & emailed on every Save">
            <div className="space-y-4">
              <div className="space-y-2">
                {siteLinksCustom.map(link => (
                  <div key={link.id}>
                    {editingLinkId === link.id ? (
                      <div className="p-3 bg-primary/5 border-2 border-primary/40 rounded-xl space-y-2">
                        <div className="grid grid-cols-[52px,1fr] gap-2">
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">Icon</p>
                            <input value={link.icon} onChange={e => setSiteLinksCustom(ls => ls.map(l => l.id === link.id ? { ...l, icon: e.target.value } : l))}
                              className="w-full px-2 py-1.5 bg-background border border-border text-foreground text-sm rounded-lg focus:outline-none focus:border-primary text-center" maxLength={4} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">Label</p>
                            <input value={link.label} onChange={e => setSiteLinksCustom(ls => ls.map(l => l.id === link.id ? { ...l, label: e.target.value } : l))}
                              placeholder="Link label" className="w-full px-3 py-1.5 bg-background border border-border text-foreground text-sm rounded-lg focus:outline-none focus:border-primary" maxLength={40} />
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">Path / URL</p>
                          <input value={link.path} onChange={e => setSiteLinksCustom(ls => ls.map(l => l.id === link.id ? { ...l, path: e.target.value } : l))}
                            placeholder="/path or https://..." className="w-full px-3 py-1.5 bg-background border border-border text-foreground text-xs font-mono rounded-lg focus:outline-none focus:border-primary" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                          <input value={link.desc} onChange={e => setSiteLinksCustom(ls => ls.map(l => l.id === link.id ? { ...l, desc: e.target.value } : l))}
                            placeholder="Short description" className="w-full px-3 py-1.5 bg-background border border-border text-foreground text-xs rounded-lg focus:outline-none focus:border-primary" maxLength={60} />
                        </div>
                        <div className="flex justify-end">
                          <button onClick={() => setEditingLinkId(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/40 rounded-lg hover:bg-primary/10 transition-all">
                            <Check size={11} /> Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 p-2.5 bg-background border border-border rounded-xl hover:border-primary/30 transition-colors">
                        <span className="text-base flex-shrink-0">{link.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-foreground">{link.label}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{getFullUrl(link.path)}</p>
                          <p className="text-[9px] text-muted-foreground/60 mt-0.5">{link.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => setEditingLinkId(link.id)} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-all" title="Edit"><Edit3 size={11} /></button>
                          <button onClick={() => copyUrl(getFullUrl(link.path))} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-all" title="Copy"><Copy size={11} /></button>
                          <a href={getFullUrl(link.path)} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-all" title="Open"><ExternalLink size={11} /></a>
                          <button onClick={() => setSiteLinksCustom(ls => ls.filter(l => l.id !== link.id))} className="p-1.5 rounded-lg border border-destructive/30 text-destructive/70 hover:bg-destructive/10 transition-all" title="Delete"><Trash2 size={11} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => { const newId = `link_${Date.now()}`; setSiteLinksCustom(ls => [...ls, { id: newId, icon: '🔗', label: 'New Link', path: '/new-path', desc: 'New page description' }]); setEditingLinkId(newId); }}
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-primary/40 text-primary font-bold text-xs rounded-xl hover:bg-primary/5 transition-all w-full justify-center">
                <Plus size={13} /> Add Custom Link
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={handleCopyAll}
                  className="flex items-center justify-center gap-1.5 py-2.5 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
                  <Copy size={12} /> Copy All
                </button>
                <button onClick={handleEmailLinks}
                  className="flex items-center justify-center gap-1.5 py-2.5 border border-primary/30 rounded-xl text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-all">
                  <Mail size={12} /> Email Links
                </button>
                <button onClick={() => setSiteLinksCustom(DEFAULT_SITE_LINKS)}
                  className="flex items-center justify-center gap-1.5 py-2.5 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:border-amber-500/50 hover:text-amber-400 transition-all">
                  <RefreshCw size={12} /> Reset
                </button>
              </div>
            </div>
          </SectionCard>
          {/* REMOVED_START

                <button onClick={() => { const subject = encodeURIComponent(`${siteName || 'EarningHub'} – Site Links`); const body = encodeURIComponent(`Hi,\n\nHere are all my site links:\n\n${siteLinksCustom.map(l => `${l.label}: ${getFullUrl(l.path)}`).join('
')}\n\nUpdated: ${new Date().toLocaleString()}`); window.open(`mailto:gclass902@gmail.com?subject=${subject}&body=${body}`, '_blank'); }}
                  className="flex items-center justify-center gap-1.5 py-2.5 border border-primary/30 rounded-xl text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-all">
                  <Mail size={12} /> Email Links
                </button>
                <button onClick={() => setSiteLinksCustom(DEFAULT_SITE_LINKS)}
                  className="flex items-center justify-center gap-1.5 py-2.5 border border-border rounded-xl text-xs font-bold text-muted-foreground hover:border-amber-500/50 hover:text-amber-400 transition-all">
                  <RefreshCw size={12} /> Reset
                </button>
              </div>
            </div>
          </SectionCard>

          REMOVED_END */}

          <SectionCard icon="🔍" title="SEO & Search Engine" desc="Control how your site appears in Google and other search engines">
            <div className="space-y-5">
              <div>
                <label className={lbl}>Page Title (Browser Tab & Google)</label>
                <input value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder={siteName || 'EarningHub — Earn Cashback on Every Offer'} className={inp} maxLength={70} />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-muted-foreground">Shown in browser tab and Google search results.</p>
                  <span className={`text-xs font-bold ${seoTitle.length > 60 ? 'text-amber-400' : 'text-muted-foreground'}`}>{seoTitle.length}/70</span>
                </div>
              </div>
              <div>
                <label className={lbl}>Meta Description (Google Snippet)</label>
                <textarea value={seoDescription} onChange={e => setSeoDescription(e.target.value)}
                  placeholder="Earn cashback on every offer — fast payouts, verified leads. Join thousands of earners today."
                  rows={3} className={inp + ' resize-none'} maxLength={160} />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-muted-foreground">Shown under your site title in Google results.</p>
                  <span className={`text-xs font-bold ${seoDescription.length > 150 ? 'text-amber-400' : 'text-muted-foreground'}`}>{seoDescription.length}/160</span>
                </div>
              </div>
              {(seoTitle || seoDescription) && (
                <div className="p-4 bg-background border border-border rounded-xl space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wide mb-2">Google Preview</p>
                  <p className="text-blue-400 text-sm font-medium">{seoTitle || siteName || 'EarningHub'}</p>
                  <p className="text-green-600 text-xs">{customDomain || 'yoursite.zite.so'}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{seoDescription || 'No description set.'}</p>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard icon="📊" title="Google Analytics (GA4)" desc="Connect Google Analytics to track visitor behavior and conversions">
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-black">📈 Auto-loads on every page.</span> Enter your GA4 Measurement ID (starts with <code className="text-primary bg-primary/10 px-1 rounded">G-</code>). Find it in Google Analytics → Admin → Data Streams.
                </p>
              </div>
              <input value={gaId} onChange={e => setGaId(e.target.value.trim())} placeholder="G-XXXXXXXXXX" className={inp} />
              {gaId && !gaId.startsWith('G-') && <p className="text-xs text-amber-400 font-bold">⚠️ GA4 IDs usually start with "G-"</p>}
              {gaId && gaId.startsWith('G-') && <p className="text-xs text-green-400 font-bold">✅ GA4 ID looks valid</p>}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 4 · MARKETING
            Hero CTA Button · Promo Popup · WiFi Warning
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="marketing" className="space-y-5 mt-0">

          <Divider label="🎯 Hero CTA Button" />

          <SectionCard icon="📝" title="Hero CTA Button (3rd Button)" desc="Add a 3rd button to the homepage hero — shown in line with Live Offers & Track Lead">
            <div className="space-y-5">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-black">🎯 How it works:</span> When enabled, a custom button appears on the hero next to <strong className="text-foreground">🎯 Live Offers</strong> and <strong className="text-foreground">🔍 Track Lead</strong> — all in one horizontal row. Link it to your cashback form, Google Form, or any page.
                </p>
              </div>
              <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${googleFormEnabled ? 'bg-primary/5 border-primary/30' : 'bg-background border-border'}`}>
                <div>
                  <p className="font-syne font-black text-sm text-foreground">Enable Cashback / Form Button</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{googleFormEnabled ? '🟢 Button is live on homepage hero' : 'Off — 3rd button hidden'}</p>
                </div>
                <Toggle value={googleFormEnabled} onChange={setGoogleFormEnabled} />
              </div>
              <div>
                <label className={lbl}>Button Label (Custom Title)</label>
                <input value={googleFormLabel} onChange={e => setGoogleFormLabel(e.target.value)} placeholder="e.g. 📝 Submit Cashback, Apply Now, Claim Form…" className={inp} maxLength={40} />
                <p className="text-xs text-muted-foreground mt-1.5">This text appears directly on the button. Max 40 characters.</p>
              </div>
              <div>
                <label className={lbl}>Button Redirect URL</label>
                <input value={googleFormUrl} onChange={e => setGoogleFormUrl(e.target.value)} placeholder="https://docs.google.com/forms/d/... or /#cashback-forms" className={inp} />
                <p className="text-xs text-muted-foreground mt-1.5">Supports Google Forms, internal paths, or any external URL.</p>
              </div>
              {googleFormEnabled && googleFormLabel && (
                <div className="p-4 bg-background border border-border rounded-xl space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Hero Button Preview (all 3 in one row)</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-white text-xs font-black" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #60a5fa 100%)' }}>🎯 Live Offers</div>
                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-border text-foreground text-xs font-black bg-card">🔍 Track Lead</div>
                    <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-primary/40 text-primary text-xs font-black bg-primary/10">📝 {googleFormLabel}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">↑ All 3 buttons appear in one horizontal line on the homepage</p>
                </div>
              )}
            </div>
          </SectionCard>

          <Divider label="📢 Promotional Popup" />

          <SectionCard icon="📢" title="Promotional Popup" desc="Show a timed popup on the homepage with animated CTA">
            <div className="space-y-5">
              <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${promoEnabled ? 'bg-primary/5 border-primary/30' : 'bg-background border-border'}`}>
                <div>
                  <p className="font-syne font-black text-sm text-foreground">Enable Promo Popup</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Shows on every page load after the configured delay</p>
                </div>
                <Toggle value={promoEnabled} onChange={setPromoEnabled} />
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-4">
                <p className="text-xs font-black text-amber-400">⏳ Popup Timing Controls</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>⏱ Appear After (seconds)</label>
                    <input type="number" min={0} max={30} step={1} value={promoDelay} onChange={e => setPromoDelay(Math.max(0, Math.min(30, Number(e.target.value) || 0)))} className={inp} />
                    <p className="text-[10px] text-muted-foreground mt-1">Default: <strong className="text-amber-400">3 seconds</strong></p>
                  </div>
                  <div>
                    <label className={lbl}>🔄 Auto-Close After (seconds)</label>
                    <input type="number" min={0} max={120} step={5} value={promoAutoClose} onChange={e => setPromoAutoClose(Math.max(0, Math.min(120, Number(e.target.value) || 0)))} className={inp} />
                    <p className="text-[10px] text-muted-foreground mt-1"><strong className="text-amber-400">0 = never auto-close</strong></p>
                  </div>
                </div>
              </div>
              <ImageUploadField label="Popup Banner Image" value={promoBannerUrl} onChange={setPromoBannerUrl}
                hint="High-quality offer or announcement banner." aspectHint="4:3 or 16:9 recommended" />
              <div className="space-y-3">
                <div><label className={lbl}>Popup Title</label><input value={promoTitle} onChange={e => setPromoTitle(e.target.value)} placeholder="e.g. 🔥 Top Deal This Week!" className={inp} maxLength={60} /></div>
                <div><label className={lbl}>Popup Subtitle</label><input value={promoSubtitle} onChange={e => setPromoSubtitle(e.target.value)} placeholder="e.g. Earn ₹500 cashback — limited slots" className={inp} maxLength={100} /></div>
                <div><label className={lbl}>CTA Button Text</label><input value={promoButtonText} onChange={e => setPromoButtonText(e.target.value)} placeholder="e.g. Claim Now →" className={inp} maxLength={40} /></div>
                <div><label className={lbl}>Banner / CTA Redirect Link</label><input value={promoRedirectLink} onChange={e => setPromoRedirectLink(e.target.value)} placeholder="e.g. /#cashback-forms or https://..." className={inp} /></div>
                <div><label className={lbl}>Link to Specific Offer (by name)</label><input value={promoOfferLink} onChange={e => setPromoOfferLink(e.target.value)} placeholder="e.g. IndiaBulls Demat" className={inp} /></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                <div>
                  <p className="font-syne font-black text-sm text-foreground">Show "Submit Cashback" Button in Popup</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Adds a button inside the popup that scrolls to the cashback form</p>
                </div>
                <Toggle value={promoCashbackFormEnabled} onChange={setPromoCashbackFormEnabled} />
              </div>
            </div>
          </SectionCard>

          <Divider label="📶 WiFi Warning" />

          <SectionCard icon="📶" title="WiFi Warning Banner" desc="Custom image shown in the 'Disable WiFi' popup before offer redirect">
            <div className="space-y-3">
              <ImageUploadField label="Custom WiFi Warning Banner" value={wifiWarningBannerUrl} onChange={setWifiWarningBannerUrl}
                hint="Shown in warning overlay before brand page redirect." aspectHint="4:3 or square recommended" />
              <p className="text-xs text-muted-foreground">💡 Appears in the overlay that advises users to disable WiFi before clicking offer links.</p>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 5 · LEADS & TRACK
            Lead Fields · Search Mode · Action Buttons · Display
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="leads" className="space-y-5 mt-0">

          <Divider label="📋 Lead Collection" />

          <SectionCard icon="📋" title="Global Lead Collection Fields" desc="Default form fields applied to ALL offers — individual offers can override">
            <LeadFieldsConfig fields={leadFields} onChange={setLeadFields} />
          </SectionCard>

          <Divider label="🔍 Tracker Search" />

          <div className="p-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">🔎</span>
              <div>
                <p className="font-syne font-black text-sm text-foreground">Search Fields = 🔎 Toggle Above</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Users can only search by fields that have the <strong className="text-emerald-400">🔍 toggle ON</strong> in the field list above. Exact match only — fully secure.
                </p>
              </div>
            </div>
            {(() => {
              const searchable = leadFields.filter(f => f.enabled && f.searchable);
              return searchable.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {searchable.map(f => (
                    <span key={f.id} className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400">
                      🔍 {f.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-amber-400 font-bold mt-2">⚠️ No fields are marked searchable — users can't track their leads!</p>
              );
            })()}
          </div>

          <Divider label="📅 Display Settings" />

          <SectionCard icon="📅" title="Lead Track Display Settings" desc="Default date filter & status history visibility for the tracker page">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={lbl}>⏱ Default Date Filter</label>
                <div className="flex flex-col gap-2">
                  {([{ v: '7d' as const, label: '7 Days', desc: 'Last 7 days — recommended', icon: '📅' }, { v: '24h' as const, label: '24 Hours', desc: 'Last 24 hrs only', icon: '⚡' }]).map(opt => (
                    <button key={opt.v} type="button" onClick={() => setLeadTrackDefaultFilter(opt.v)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${leadTrackDefaultFilter === opt.v ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}>
                      <span className="text-base flex-shrink-0">{opt.icon}</span>
                      <div><p className="text-xs font-black">{opt.label}</p><p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p></div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl}>📋 Status History Visibility</label>
                <div className="flex flex-col gap-2">
                  {([
                    { v: 'show' as const,      icon: '📖', label: 'Show (Expanded)',   desc: 'Open by default',        activeClass: 'border-primary bg-primary/10 text-primary' },
                    { v: 'collapsed' as const, icon: '🔽', label: 'Collapsed / Swipe', desc: 'Tap to reveal history',  activeClass: 'border-amber-500/60 bg-amber-500/10 text-amber-400' },
                    { v: 'hidden' as const,    icon: '🙈', label: 'Hide from Tracker', desc: 'Not visible to users',   activeClass: 'border-red-500/60 bg-red-500/10 text-red-400' },
                  ] as const).map(opt => (
                    <button key={opt.v} type="button" onClick={() => setStatusHistoryMode(opt.v)}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${statusHistoryMode === opt.v ? opt.activeClass : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}>
                      <span className="text-base flex-shrink-0">{opt.icon}</span>
                      <div><p className="text-xs font-black">{opt.label}</p><p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <Divider label="🎯 Global Action Buttons" />

          <SectionCard icon="🎯" title="Global Action Buttons" desc="Buttons shown on EVERY lead tracking card — admin-controlled defaults">
            <div className="space-y-5">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-black">💡 How it works:</span> These appear at the bottom of every lead tracking card. Per-lead overrides can be set from <strong className="text-foreground">Lead Collection → 🎯 button</strong>.
                </p>
              </div>
              {globalButtons.map(btn => (
                <div key={btn.id} className={`p-4 border rounded-xl space-y-4 ${btn.enabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{BUTTON_TYPE_ICONS[btn.type]}</span>
                      <div>
                        <p className="font-syne font-black text-sm text-foreground">{BUTTON_TYPE_LABELS[btn.type]}</p>
                        <p className="text-xs text-muted-foreground capitalize">{btn.type.replace('_', ' ')} button</p>
                      </div>
                    </div>
                    <Toggle value={btn.enabled} onChange={v => updateButton(btn.id, 'enabled', v)} />
                  </div>
                  {btn.enabled && (
                    <div className="space-y-3">
                      <div><label className={lbl}>Button Label</label><input value={btn.label} onChange={e => updateButton(btn.id, 'label', e.target.value)} placeholder={`e.g. ${BUTTON_TYPE_LABELS[btn.type]}`} className={inp} maxLength={50} /></div>
                      <div><label className={lbl}>Message to User</label><input value={btn.message} onChange={e => updateButton(btn.id, 'message', e.target.value)} placeholder="Optional context message for the user" className={inp} maxLength={100} /></div>
                      {btn.type !== 'complete_offer' && (
                        <div><label className={lbl}>Redirect URL</label><input value={btn.url} onChange={e => updateButton(btn.id, 'url', e.target.value)} placeholder="https://..." className={inp} /></div>
                      )}
                      {btn.type === 'complete_offer' && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                          <span className="text-emerald-400 text-lg flex-shrink-0">✅</span>
                          <p className="text-xs text-muted-foreground"><strong className="text-emerald-400">Auto Brand Link:</strong> Uses each offer's redirect link automatically.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 6 · PAYOUTS & CTA
            Status CTAs · Payout Labels · Dashboard KPIs · Labels · Tags
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="payouts" className="space-y-5 mt-0">

          <Divider label="🎨 Status CTA Buttons (v2)" />

          <SectionCard icon="🎨" title="Status CTA System — 5 Defaults + 1 Custom" desc="Premium CTA buttons per canonical status. Per-lead overrides take priority.">
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-black">🎯 Priority:</span> Per-lead CTA override → These global defaults → Built-in fallback.
                  <br/><span className="text-primary font-black">📋 Statuses:</span> 🟡 Pending · 🟠 On Hold · ⚪ Approved · 🟢 Cashback Sent · 🔴 Missing · ✨ Custom
                </p>
              </div>
              {([
                { key: 'pending'      as const, statusEmoji: '🟡', label: 'PENDING',        color: '#f59e0b', border: 'rgba(245,158,11,0.4)',  bg: 'rgba(245,158,11,0.06)',  urlHint: 'Offer/completion page URL',             msgHint: 'e.g. Your lead is being processed. Continue to complete.' },
                { key: 'onHold'       as const, statusEmoji: '🟠', label: 'ON HOLD',        color: '#f97316', border: 'rgba(249,115,22,0.4)',  bg: 'rgba(249,115,22,0.06)',  urlHint: 'Support / resolution flow URL',        msgHint: 'e.g. Your lead is on hold. Resolve the issue to continue.' },
                { key: 'approved'     as const, statusEmoji: '⚪', label: 'APPROVED',       color: '#94a3b8', border: 'rgba(148,163,184,0.4)', bg: 'rgba(148,163,184,0.06)', urlHint: 'Cashback status page URL',              msgHint: 'e.g. Approved! Cashback will be sent soon.' },
                { key: 'cashbackSent' as const, statusEmoji: '🟢', label: 'CASHBACK SENT',  color: '#22c55e', border: 'rgba(34,197,94,0.4)',   bg: 'rgba(34,197,94,0.06)',   urlHint: 'Transaction details / next offer URL', msgHint: 'e.g. Cashback sent successfully! Check your account.' },
                { key: 'missing'      as const, statusEmoji: '🔴', label: 'MISSING',        color: '#ef4444', border: 'rgba(239,68,68,0.4)',   bg: 'rgba(239,68,68,0.06)',   urlHint: 'Support / Telegram link',              msgHint: 'e.g. Lead not found. Contact support with your Lead ID.' },
              ] as const).map(s => (
                <div key={s.key} className="rounded-xl border p-4 space-y-3" style={{ borderColor: s.border, background: s.bg }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{s.statusEmoji}</span>
                      <p className="font-syne font-black text-xs uppercase tracking-wider" style={{ color: s.color }}>{s.label}</p>
                    </div>
                    <button type="button" onClick={() => setStatusCtaConfig(prev => ({ ...prev, [s.key]: { ...DEFAULT_STATUS_CTA_V2[s.key] } }))}
                      className="text-[10px] font-bold text-muted-foreground hover:text-primary px-2 py-1 rounded-lg border border-border/40 hover:border-primary/30 transition-all flex items-center gap-1">
                      <RefreshCw size={10} /> Reset
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Emoji/Icon</label>
                      <input value={statusCtaConfig[s.key].emoji || ''} onChange={e => setStatusCtaConfig(prev => ({ ...prev, [s.key]: { ...prev[s.key], emoji: e.target.value } }))} placeholder={DEFAULT_STATUS_CTA_V2[s.key].emoji} className={inp} maxLength={4} />
                    </div>
                    <div>
                      <label className={lbl}>Button Text</label>
                      <input value={statusCtaConfig[s.key].label} onChange={e => setStatusCtaConfig(prev => ({ ...prev, [s.key]: { ...prev[s.key], label: e.target.value } }))} placeholder={DEFAULT_STATUS_CTA_V2[s.key].label} className={inp} maxLength={50} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>User Comment/Message</label>
                    <textarea value={statusCtaConfig[s.key].message} onChange={e => setStatusCtaConfig(prev => ({ ...prev, [s.key]: { ...prev[s.key], message: e.target.value } }))} placeholder={s.msgHint} rows={2} className={inp + ' resize-none text-xs'} maxLength={250} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Redirect URL / Action</label>
                      <input value={statusCtaConfig[s.key].url} onChange={e => setStatusCtaConfig(prev => ({ ...prev, [s.key]: { ...prev[s.key], url: e.target.value } }))} placeholder={s.urlHint} className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Button Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={statusCtaConfig[s.key].color || s.color} onChange={e => setStatusCtaConfig(prev => ({ ...prev, [s.key]: { ...prev[s.key], color: e.target.value } }))} className="w-10 h-10 rounded-xl border border-border cursor-pointer p-1 bg-card flex-shrink-0" />
                        <input value={statusCtaConfig[s.key].color || ''} onChange={e => setStatusCtaConfig(prev => ({ ...prev, [s.key]: { ...prev[s.key], color: e.target.value } }))} placeholder={s.color} className={inp} />
                      </div>
                    </div>
                  </div>
                  {/* Live Preview */}
                  <div className="rounded-lg p-3 border" style={{ borderColor: s.border, background: `${s.bg}` }}>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Preview</p>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: s.color, opacity: 0.8 }}>{statusCtaConfig[s.key].message || s.msgHint}</p>
                    <div className="py-2.5 rounded-lg text-center text-white text-xs font-black" style={{ background: statusCtaConfig[s.key].color || s.color }}>
                      {statusCtaConfig[s.key].emoji || DEFAULT_STATUS_CTA_V2[s.key].emoji} {statusCtaConfig[s.key].label || DEFAULT_STATUS_CTA_V2[s.key].label}
                    </div>
                  </div>
                </div>
              ))}

              {/* ─── Custom CTA (6th) ─── */}
              {(() => {
                const custom: CustomCTAEntry = statusCtaConfig.custom ?? DEFAULT_STATUS_CTA_V2.custom;
                const updateCustom = (patch: Partial<CustomCTAEntry>) => setStatusCtaConfig(prev => ({ ...prev, custom: { ...(prev.custom ?? DEFAULT_STATUS_CTA_V2.custom), ...patch } as CustomCTAEntry }));
                return (
                  <div className="rounded-xl border-2 border-dashed p-4 space-y-3" style={{ borderColor: custom.enabled ? '#8b5cf655' : 'rgba(148,163,184,0.3)', background: custom.enabled ? 'rgba(139,92,246,0.04)' : 'transparent' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <p className="font-syne font-black text-xs uppercase tracking-wider" style={{ color: custom.enabled ? '#a78bfa' : '#94a3b8' }}>CUSTOM CTA</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${custom.enabled ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-muted text-muted-foreground border border-border'}`}>{custom.enabled ? 'ACTIVE' : 'DISABLED'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Toggle value={custom.enabled} onChange={v => updateCustom({ enabled: v })} />
                        <button type="button" onClick={() => setStatusCtaConfig(prev => ({ ...prev, custom: { ...DEFAULT_STATUS_CTA_V2.custom } }))}
                          className="text-[10px] font-bold text-muted-foreground hover:text-primary px-2 py-1 rounded-lg border border-border/40 hover:border-primary/30 transition-all flex items-center gap-1">
                          <RefreshCw size={10} /> Reset
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">Separate CTA not tied to any fixed status. Appears alongside the status CTA — never overwrites it.</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={lbl}>Emoji/Icon</label>
                        <input value={custom.emoji} onChange={e => updateCustom({ emoji: e.target.value })} placeholder="🎁" className={inp} maxLength={4} />
                      </div>
                      <div>
                        <label className={lbl}>Button Text</label>
                        <input value={custom.label} onChange={e => updateCustom({ label: e.target.value })} placeholder="Claim Offer" className={inp} maxLength={40} />
                      </div>
                      <div>
                        <label className={lbl}>Button Color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={custom.color || '#8b5cf6'} onChange={e => updateCustom({ color: e.target.value })} className="w-10 h-10 rounded-xl border border-border cursor-pointer p-1 bg-card flex-shrink-0" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>User Comment/Message</label>
                      <textarea value={custom.message} onChange={e => updateCustom({ message: e.target.value })} placeholder="Complete this special offer to unlock your reward." rows={2} className={inp + ' resize-none text-xs'} maxLength={250} />
                    </div>
                    <div>
                      <label className={lbl}>Redirect URL / Action</label>
                      <input value={custom.url} onChange={e => updateCustom({ url: e.target.value })} placeholder="https://example.com/offer" className={inp} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>Start Date (optional)</label>
                        <input type="date" value={custom.startDate || ''} onChange={e => updateCustom({ startDate: e.target.value })} className={inp} />
                      </div>
                      <div>
                        <label className={lbl}>End Date (optional)</label>
                        <input type="date" value={custom.endDate || ''} onChange={e => updateCustom({ endDate: e.target.value })} className={inp} />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Target Statuses (optional, comma-separated — blank = all)</label>
                      <input value={(custom.targetStatuses || []).join(', ')} onChange={e => updateCustom({ targetStatuses: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="e.g. Pending, On Hold" className={inp} />
                    </div>
                    {/* Live Preview */}
                    {custom.enabled && (
                      <div className="rounded-lg p-3 border" style={{ borderColor: `${custom.color}55`, background: `${custom.color}08` }}>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Preview</p>
                        <p className="text-xs leading-relaxed mb-2" style={{ color: custom.color, opacity: 0.8 }}>{custom.message}</p>
                        <div className="py-2.5 rounded-lg text-center text-white text-xs font-black" style={{ background: custom.color }}>
                          {custom.emoji} {custom.label}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </SectionCard>

          <Divider label="💡 User-Facing Payout Data" />

          <div className={`rounded-2xl border-2 p-5 transition-all ${globalUserFacingEnabled ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${globalUserFacingEnabled ? 'bg-primary/20' : 'bg-muted'}`}>💡</div>
                <div>
                  <p className="font-syne font-black text-sm text-foreground">Global User Facing Toggle</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{globalUserFacingEnabled ? '🟢 User-facing payout data is ACTIVE' : '🔴 ALL user-facing payout data hidden — overrides individual toggles'}</p>
                </div>
              </div>
              <Toggle value={globalUserFacingEnabled} onChange={setGlobalUserFacingEnabled} />
            </div>
            {!globalUserFacingEnabled && (<div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"><p className="text-xs text-red-400 font-bold">⚠️ Master switch is OFF — no payout amounts shown to users regardless of toggles below.</p></div>)}
          </div>

          <SectionCard icon="💰" title="Payout & Revenue Labels" desc="Customize earning labels and what users see on their tracker page">
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>✂️ Admin Cut Label</label><input value={payoutEarningLabel} onChange={e => setPayoutEarningLabel(e.target.value)} placeholder="Admin Cut" className={inp} maxLength={30} /></div>
                <div><label className={lbl}>📊 Estimate User Label</label><input value={payoutUserLabel} onChange={e => setPayoutUserLabel(e.target.value)} placeholder="Estimate User" className={inp} maxLength={30} /></div>
                <div><label className={lbl}>✅ User Got Label</label><input value={payoutSendLabel} onChange={e => setPayoutSendLabel(e.target.value)} placeholder="User Got" className={inp} maxLength={30} /></div>
              </div>
              <div className="space-y-3">
                {[
                  { label: '📊 Show Estimate User Amount on Tracker', desc: 'Users see assigned payout (User Earning field)', state: showUserPayoutInTracker, set: setShowUserPayoutInTracker },
                  { label: '✅ Show User Got Amount on Tracker',       desc: 'Users see actual sent amount (Send User field)', state: showSendAmountInTracker, set: setShowSendAmountInTracker },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${item.state ? 'bg-primary/5 border-primary/30' : 'bg-background border-border'}`}>
                    <div><p className="font-syne font-black text-sm text-foreground">{item.label}</p><p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p></div>
                    <Toggle value={item.state} onChange={item.set} />
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <Divider label="📊 Dashboard KPIs" />

          <SectionCard icon="📊" title="Dashboard KPI Display" desc="Control which metric cards show on the admin dashboard">
            <div className="space-y-3">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground">Toggle each KPI card on/off. Hidden KPIs won't appear on the main dashboard. Changes apply after Save.</p>
              </div>
              {[
                { label: '🏦 My Total Earnings',   desc: 'Sum of admin cut from all leads',          state: dashShowMyEarnings,       set: setDashShowMyEarnings },
                { label: '👤 User Payout Total',   desc: 'Sum of user payout amounts',               state: dashShowUserPayoutTotal,  set: setDashShowUserPayoutTotal },
                { label: '📤 Send User Total',     desc: 'Total amount actually sent to users',      state: dashShowSendUserTotal,    set: setDashShowSendUserTotal },
                { label: '💸 Pending Payouts',     desc: 'Revenue tied to approved (unpaid) leads',  state: dashShowPendingPayouts,   set: setDashShowPendingPayouts },
                { label: '📊 Conversion Rate',     desc: 'Approved+Paid / Total leads %',            state: dashShowConversionRate,   set: setDashShowConversionRate },
                { label: '⚠️ Fraud Alerts',        desc: 'Multiple UPIs from same IP in 24h',        state: dashShowFraudAlerts,      set: setDashShowFraudAlerts },
                { label: "📅 Today's Leads",       desc: 'Leads submitted today',                    state: dashShowTodayLeads,       set: setDashShowTodayLeads },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${item.state ? 'bg-primary/5 border-primary/30' : 'bg-background border-border opacity-60'}`}>
                  <div><p className="font-syne font-black text-sm text-foreground">{item.label}</p><p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p></div>
                  <Toggle value={item.state} onChange={item.set} />
                </div>
              ))}
            </div>
          </SectionCard>

          <Divider label="🏷️ Status Labels & Lead Tags" />

          <SectionCard icon="🏷️" title="Status Custom Labels" desc="Rename status values shown to users on the tracker — internal values stay the same">
            <div className="space-y-4">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-black">💡 How it works:</span> Leave blank to use default. Enter a custom name to show users a friendlier label (e.g., rename <strong className="text-foreground">Pending</strong> → <strong className="text-foreground">Being Processed</strong>).
                </p>
              </div>
              {(['Pending','Hold','Approved','Cashback Sent','Missing','On Hold','Paid','Duplicate'] as const).map(s => (
                <div key={s} className="grid grid-cols-[1fr,auto,1fr] items-center gap-3">
                  <div className="px-3 py-2.5 bg-background border border-border/60 rounded-xl text-xs font-black text-muted-foreground truncate">{s}</div>
                  <span className="text-muted-foreground text-sm font-black">→</span>
                  <div className="relative">
                    <input value={statusLabels[s] || ''} onChange={e => setStatusLabels(p => ({ ...p, [s]: e.target.value }))} placeholder={s} className={inp + ' pr-8'} maxLength={40} />
                    {statusLabels[s] && (<button type="button" onClick={() => setStatusLabels(p => { const n = { ...p }; delete n[s]; return n; })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive text-xs">✕</button>)}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon="🏷️" title="Lead Classification Options" desc="Custom Customer Types & App Sources shown in Lead Collection dropdowns">
            <div className="space-y-5">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-primary font-black">💡 Built-in defaults:</span> Customer Types: Self · Family · Unknown · College Friend | App Sources: Credit code · Earn pati. Add your own below.
                </p>
              </div>
              <div>
                <label className={lbl}>👤 Additional Customer Types</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {customCustomerTypes.map((t, i) => (<span key={i} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded-full">{t}<button onClick={() => setCustomCustomerTypes(p => p.filter((_, j) => j !== i))} className="text-blue-400/70 hover:text-destructive text-xs ml-0.5">✕</button></span>))}
                  {customCustomerTypes.length === 0 && <p className="text-xs text-muted-foreground">No custom types added yet.</p>}
                </div>
                <div className="flex gap-2">
                  <input value={newCustomerType} onChange={e => setNewCustomerType(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCustomerType.trim()) { setCustomCustomerTypes(p => [...p, newCustomerType.trim()]); setNewCustomerType(''); } }} placeholder="e.g. Office Colleague, Relative…" className={inp} maxLength={40} />
                  <button onClick={() => { if (newCustomerType.trim()) { setCustomCustomerTypes(p => [...p, newCustomerType.trim()]); setNewCustomerType(''); } }} className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-sm font-black rounded-xl hover:bg-primary/20 transition-all flex-shrink-0"><Plus size={14} /></button>
                </div>
              </div>
              <div>
                <label className={lbl}>📱 Additional App Sources</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {customAppSources.map((a, i) => (<span key={i} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full">{a}<button onClick={() => setCustomAppSources(p => p.filter((_, j) => j !== i))} className="text-emerald-400/70 hover:text-destructive text-xs ml-0.5">✕</button></span>))}
                  {customAppSources.length === 0 && <p className="text-xs text-muted-foreground">No custom sources added yet.</p>}
                </div>
                <div className="flex gap-2">
                  <input value={newAppSource} onChange={e => setNewAppSource(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newAppSource.trim()) { setCustomAppSources(p => [...p, newAppSource.trim()]); setNewAppSource(''); } }} placeholder="e.g. Groww, Zerodha, Angel One…" className={inp} maxLength={40} />
                  <button onClick={() => { if (newAppSource.trim()) { setCustomAppSources(p => [...p, newAppSource.trim()]); setNewAppSource(''); } }} className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary text-sm font-black rounded-xl hover:bg-primary/20 transition-all flex-shrink-0"><Plus size={14} /></button>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 7 · COMMUNITY
            Social Links · Telegram · WhatsApp · Notifications · Referral
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="community" className="space-y-5 mt-0">

          <Divider label="🔗 Social Media" />

          <SectionCard icon="🔗" title="Social Media" desc="All social & support links — shown in navigation, footer, tracker & all pages">
            <div className="space-y-3">
              {socialLinks.length === 0 && (<div className="p-4 bg-background border border-border rounded-xl text-center text-muted-foreground text-sm">No social links added yet. Add Telegram, WhatsApp, Help, or any platform.</div>)}
              {socialLinks.map(link => (
                <div key={link.id} className="p-4 bg-background border border-border rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-syne font-black text-sm text-foreground">{link.name || 'New Social Link'}</p>
                    <button onClick={() => removeSocialLink(link.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 border border-destructive/30"><Trash2 size={14} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Platform Name</label><input value={link.name} onChange={e => updateSocialLink(link.id, 'name', e.target.value)} placeholder="e.g. Telegram, WhatsApp, Help" className={inp} /></div>
                    <div><label className={lbl}>URL / Link</label><input value={link.url} onChange={e => updateSocialLink(link.id, 'url', e.target.value)} placeholder="https://t.me/channel or mailto:..." className={inp} /></div>
                  </div>
                  <ImageUploadField label="Platform Icon / Logo" value={link.iconUrl} onChange={v => updateSocialLink(link.id, 'iconUrl', v)} hint="Upload or paste URL of platform logo (JPG/PNG/SVG)." aspectHint="Square (1:1) recommended" />
                </div>
              ))}
              <button onClick={addSocialLink} className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-primary/40 text-primary font-bold text-sm rounded-xl hover:bg-primary/5 transition-all w-full justify-center">
                <Plus size={15} /> Add Social Link
              </button>
            </div>
          </SectionCard>

          <Divider label="🔔 Lead Notifications" />

          <SectionCard icon="🔔" title="Lead Notifications" desc="Get an email alert every time a new lead is submitted on your platform">
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-2">
                <span className="text-lg flex-shrink-0">📧</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-emerald-400">Instant Lead Alerts:</strong> Every time a user submits a lead, a notification email is sent to the address below — includes lead ID, offer name, payout, and all user data. Leave blank to disable.
                </p>
              </div>
              <div>
                <label className={lbl}>Notification Email Address</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">📧</span>
                  <input type="email" value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)} placeholder="e.g. admin@yoursite.com" className={inp + ' pl-10'} />
                </div>
                {notificationEmail && (<div className="flex items-center gap-2 mt-2 p-2.5 bg-primary/5 border border-primary/20 rounded-xl"><span className="text-green-400 text-sm">✅</span><p className="text-xs text-muted-foreground">Notifications → <strong className="text-foreground">{notificationEmail}</strong></p></div>)}
              </div>
            </div>
          </SectionCard>

          <Divider label="🤝 Referral Program" />

          <SectionCard icon="🤝" title="Referral Program" desc="Full control over the refer & earn system shown on homepage">
            <div className="space-y-5">
              <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${referralEnabled ? 'bg-primary/5 border-primary/30' : 'bg-background border-border'}`}>
                <div>
                  <p className="font-syne font-black text-sm text-foreground">Show Referral Section on Homepage</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{referralEnabled ? '🟢 Referral section active' : 'Off — referral section hidden'}</p>
                </div>
                <Toggle value={referralEnabled} onChange={setReferralEnabled} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={lbl}>Referrer Earns (₹)</label><input type="number" value={referralBonusYou} onChange={e => setReferralBonusYou(Number(e.target.value) || 0)} placeholder="50" min={0} className={inp} /></div>
                <div><label className={lbl}>Friend Gets (₹)</label><input type="number" value={referralBonusFriend} onChange={e => setReferralBonusFriend(Number(e.target.value) || 0)} placeholder="25" min={0} className={inp} /></div>
              </div>
              <div><label className={lbl}>Min. Offers to Qualify</label><input type="number" value={referralMinOffers} onChange={e => setReferralMinOffers(Math.max(1, Number(e.target.value) || 1))} placeholder="1" min={1} max={10} className={inp} /></div>
              <div><label className={lbl}>Referral Terms & Conditions</label><textarea value={referralTerms} onChange={e => setReferralTerms(e.target.value)} rows={3} placeholder="e.g. Bonus credited within 7 working days. Valid for new users only." className={inp + ' resize-none'} maxLength={300} /></div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════
            TAB 8 · SECURITY
            Overview · Account Status · Credentials · Login Methods
        ════════════════════════════════════════════════════════════ */}
        <TabsContent value="security" className="space-y-5 mt-0">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '🔒', label: 'Password Security', value: 'Server-Side Only',  desc: 'Never exposed in browser DevTools', color: 'text-green-400',  bg: 'bg-green-500/5 border-green-500/20' },
              { icon: '📧', label: 'OTP Login',         value: 'Enabled',           desc: 'One-time codes via admin email',     color: 'text-primary',    bg: 'bg-primary/5 border-primary/20' },
              { icon: '🛡️', label: 'Access Control',    value: 'Universal Creds',   desc: 'Hardcoded fallback + env variable',  color: 'text-violet-400', bg: 'bg-violet-500/5 border-violet-500/20' },
            ].map(item => (
              <div key={item.label} className={`p-4 rounded-2xl border ${item.bg}`}>
                <div className="flex items-center gap-2 mb-2"><span className="text-xl">{item.icon}</span><p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{item.label}</p></div>
                <p className={`font-syne font-black text-sm ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <SectionCard icon="🔐" title="Admin Account Status" desc="Your login credentials and security configuration">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Default Admin ID',   value: 'ranahub902',             icon: '👤' },
                  { label: 'Login Methods',       value: 'Google 2-Step · Magic Link',  icon: '🔑' },
                  { label: 'Role',                value: 'Super Admin',            icon: '⭐' },
                  { label: 'Session Storage',     value: 'sessionStorage',         icon: '💾' },
                  { label: 'Login Methods',       value: 'Password + OTP Email',   icon: '🔑' },
                  { label: 'Status',              value: '✅ Active & Verified',    icon: '🟢' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-background border border-border rounded-xl p-3.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">{icon} {label}</p>
                    <p className="font-syne font-black text-xs text-foreground break-all">{value}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <p className="text-xs font-black text-emerald-400 flex items-center gap-2">🛡️ Security Architecture</p>
                <ul className="text-xs text-muted-foreground space-y-1.5">
                  <li>✅ Passwords validated <strong className="text-foreground">100% server-side</strong> — never in browser DevTools</li>
                  <li>✅ <strong className="text-foreground">Two login methods:</strong> Admin ID + Password, or One-Time Password (OTP)</li>
                  <li>✅ OTP codes are single-use and expire in <strong className="text-foreground">10 minutes</strong></li>
                  <li>✅ Credentials work <strong className="text-foreground">universally</strong> — survive export/import across Zite accounts</li>
                  <li>✅ <strong className="text-foreground">ZITE_ADMIN_PASSWORD</strong> env variable is the single source of truth</li>
                </ul>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon="✏️" title="Change Admin Credentials" desc="Update your Admin ID and password — verified via OTP">
            <AdminCredentials password={password} onCredentialsChanged={() => {
              toast.info('Credentials updated. Please log in again.');
              setTimeout(() => { sessionStorage.removeItem('eh_admin_pw'); window.location.reload(); }, 2500);
            }} />
          </SectionCard>

          <SectionCard icon="🔑" title="Login Methods" desc="Both methods are always available — use whichever is convenient">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: '🔐', bg: 'bg-primary/20', title: 'Google 2-Step', sub: 'Google identity + admin password', body: 'Sign in with your authorized Google account, then verify with admin password. Two-factor security.', detail: 'Google → Password verification', detailBg: 'bg-primary/5 border-primary/20' },
                { icon: '✨', bg: 'bg-emerald-500/20', title: 'Magic Link', sub: 'One-click email login', body: 'Receive a secure magic link to your authorized email. Click to login instantly — no password needed.', detail: '✨ Magic Link → Authorized email', detailBg: 'bg-emerald-500/5 border-emerald-500/20' },
              ].map(item => (
                <div key={item.title} className="p-4 bg-background border border-border rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center text-sm flex-shrink-0`}>{item.icon}</div>
                    <div><p className="font-syne font-black text-sm text-foreground">{item.title}</p><p className="text-[10px] text-muted-foreground">{item.sub}</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                  <div className={`p-2 border rounded-lg ${item.detailBg}`}><p className="text-[10px] font-mono text-muted-foreground">{item.detail}</p></div>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* ── Sticky Save Button ── */}
      <div className="sticky bottom-4 z-10">
        <button onClick={handleSave} disabled={saving}
          className="w-full py-4 font-syne font-black text-base text-white bg-gradient-to-r from-primary to-blue-400 rounded-2xl transition-all hover:opacity-90 disabled:opacity-60 shadow-xl blue-glow flex items-center justify-center gap-2">
          <Save size={18} />
          {saving ? 'Saving…' : '💾 Save All Settings'}
        </button>
      </div>
    </div>
  );
}
