// ─── Deep Telemetry ──────────────────────────────────────────────────────────

export interface TelemetryData {
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  os: string;
  browser: string;
  networkType: string; // 4g, 3g, wifi, slow-2g, Unknown
  ip: string;
  country: string;
  region: string;
  city: string;
  timeSpentSeconds: number;
  scrollDepth: number; // 0-100%
  ctaClicks: number;
  userAgent: string;
  deviceFingerprint: string;
  capturedAt: string;
}

// ─── Marketing Metrics ────────────────────────────────────────────────────────

export interface MarketingMetrics {
  cpv: number; // Cost Per View
  cpl: number; // Cost Per Lead
  ctr: number; // Click-Through Rate
  conversionRate: number;
  totalViews: number;
  totalLeads: number;
  totalRevenue: number;
}

// ─── Fraud Metrics ────────────────────────────────────────────────────────────

export interface FraudMetrics {
  isFlagged: boolean;
  flagReason: string;
  sharedIp?: string;
}

export interface Offer {
  id: string;
  name: string;
  emoji: string;
  description: string;
  steps: string;
  payout: number;
  category: string;
  tags: string;
  redirectLink: string;
  status: string;
  fieldsConfig: string;
  formEnabled: boolean;
  formConfig: string;
  logoUrl: string;
  bannerUrl: string;
  warningPopupImage: string;
  warningPopupActive: boolean;
  leadConfigEnabled: boolean;
  termsAndConditions: string;
  rank: number;
  expiresAt?: string;
  totalSlots: number;
  filledSlots: number;
  sampleScreenshotUrl: string;
  // Private Campaign fields
  isPrivate?: boolean;
  privateSlug?: string;
  referrerFormConfig?: string; // JSON array of ReferrerFormField[]
  referralEnabled?: boolean;
  // ── CHANGES: Three-way payout split ──
  referralAdminCut?: number;
  referralDefaultReferrerCut?: number;
  referralDefaultUserEstimate?: number;
  // Flexible payout display
  payoutDisplay?: string; // e.g. "Flat ₹500", "Upto ₹500", "₹200-₹500", or any custom text
  // Explicit payout split (admin-only)
  userPayout?: number;
  adminPayout?: number;
}

export interface FieldDef {
  label: string;
  type: 'text' | 'tel' | 'email';
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'date' | 'file' | 'number' | 'textarea';
  required: boolean;
  visible: boolean;
  placeholder?: string;
}

export interface FormConfig {
  enabled: boolean;
  title: string;
  posterUrl?: string;
  submitButtonText: string;
  submitConditions: string[];
  fields: FormField[];
}

export interface Poster {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface Lead {
  id: string;
  leadId: string;
  summary: string;
  offerName: string;
  offerPayout: number;
  leadData: string;
  status: string;
  publicRemark: string;
  internalNote: string;
  actionConfig: string;
  createdAt: string;
  updatedAt: string; // Auto-updated on every modification — the "last modified" timestamp
  createdByType: string; // 'Admin' for admin-created, '' for user-submitted
  resolvedSubmittedAt: string; // submissionDate override if set, else createdAt — canonical display date
  isPrivateLead?: boolean; // true when lead originated from a Private Campaign
  isReferralLead?: boolean; // true when lead originated from a referral link
  referralCode?: string; // The referral code used
  referralLinkId?: string; // FK to ReferralLinks table
}

// ─── Custom Action Config (per Lead) ──────────────────────────────────────────

export interface CustomActionConfig {
  actionMessage: string;
  buttonLabel: string;
  buttonRedirectUrl: string;
  clickCount: number;
  lastClickAt?: string;
  completionClicks: number;
  lastCompletionAt?: string;
  hiddenFromTracker?: boolean;
}

// ─── Status CTA Config (v2 — 5 canonical statuses) ───────────────────────────

export interface StatusCTAEntry {
  emoji: string;
  label: string;
  url: string;
  message: string;
  color?: string;
}

export type CanonicalStatus = 'pending' | 'onHold' | 'approved' | 'cashbackSent' | 'missing';

export interface CustomCTAEntry {
  enabled: boolean;
  emoji: string;
  label: string;
  url: string;
  message: string;
  color: string;
  targetStatuses: string[];
  targetReasons: string[];
  startDate?: string;
  endDate?: string;
}

export interface StatusCTAConfigV2 {
  pending: StatusCTAEntry;
  onHold: StatusCTAEntry;
  approved: StatusCTAEntry;
  cashbackSent: StatusCTAEntry;
  missing: StatusCTAEntry;
  custom: CustomCTAEntry;
}

export const DEFAULT_STATUS_CTA_V2: StatusCTAConfigV2 = {
  pending: {
    emoji: '▶️', label: 'Continue', url: '', color: '#f59e0b',
    message: 'Your lead is still being processed.',
  },
  onHold: {
    emoji: '🛠️', label: 'Resolve Issue', url: '', color: '#f97316',
    message: 'Your lead is on hold and needs attention.',
  },
  approved: {
    emoji: '💰', label: 'View Cashback Status', url: '', color: '#94a3b8',
    message: 'Your lead is approved. Cashback will be sent soon.',
  },
  cashbackSent: {
    emoji: '🧾', label: 'View Transaction', url: '', color: '#22c55e',
    message: 'Cashback sent successfully. Check your account.',
  },
  missing: {
    emoji: '💬', label: 'Contact Support', url: '', color: '#ef4444',
    message: "We couldn't find your lead. Contact support.",
  },
  custom: {
    enabled: false, emoji: '🎁', label: 'Claim Offer', url: '', color: '#8b5cf6',
    message: 'Take the next step below.',
    targetStatuses: [], targetReasons: [],
  },
};

// Legacy aliases
export type StatusCTAConfig = StatusCTAConfigV2;
export const DEFAULT_STATUS_CTA_CONFIG = DEFAULT_STATUS_CTA_V2;

// ─── Status Display Labels (admin-customizable per status value) ──────────────

export type StatusLabelsConfig = Record<string, string>;
export const DEFAULT_STATUS_LABELS: StatusLabelsConfig = {};

// ─── Status History Visibility ────────────────────────────────────────────────
export type StatusHistoryMode = 'show' | 'collapsed' | 'hidden';

// ─── Payout Config ────────────────────────────────────────────────────────────

export interface PayoutConfig {
  earningLabel: string;           // Admin's earning label (e.g. "My Earning")
  userPayoutLabel: string;        // User payout label (e.g. "User Earning")
  sendUserLabel: string;          // Sent amount label (e.g. "Send User")
  showUserPayoutInTracker: boolean; // Show user payout on public tracker
  showSendAmountInTracker: boolean; // Show sent amount on public tracker
  defaultSplitMode: 'fixed' | 'percent'; // How split is calculated
  globalUserFacingEnabled: boolean; // Master toggle — when false, no payout data shown to users
}

export const DEFAULT_PAYOUT_CONFIG: PayoutConfig = {
  earningLabel: 'My Earning',
  userPayoutLabel: 'User Earning',
  sendUserLabel: 'Send User',
  showUserPayoutInTracker: false,
  showSendAmountInTracker: false,
  defaultSplitMode: 'fixed',
  globalUserFacingEnabled: true,
};

// ─── Dashboard Customization ──────────────────────────────────────────────────

export interface DashboardCustom {
  showMyEarnings: boolean;
  showUserPayoutTotal: boolean;
  showSendUserTotal: boolean;
  showNetProfit: boolean;
  showPendingPayouts: boolean;
  showConversionRate: boolean;
  showFraudAlerts: boolean;
  showTodayLeads: boolean;
}

export const DEFAULT_DASHBOARD_CUSTOM: DashboardCustom = {
  showMyEarnings: true,
  showUserPayoutTotal: true,
  showSendUserTotal: true,
  showNetProfit: true,
  showPendingPayouts: true,
  showConversionRate: true,
  showFraudAlerts: true,
  showTodayLeads: true,
};

// (Legacy StatusCTAConfig moved to unified v2 definition above)

// ─── Global Action Button (admin-configured, shows on all tracking cards) ────

export type GlobalActionButtonType = 'complete_offer' | 'submit_form' | 'contact_us';

export interface GlobalActionButton {
  id: string;
  type: GlobalActionButtonType;
  enabled: boolean;
  label: string;
  message: string;
  url: string;
  useOfferLink: boolean;
}

export const DEFAULT_GLOBAL_ACTION_BUTTONS: GlobalActionButton[] = [
  {
    id: 'complete',
    type: 'complete_offer',
    enabled: true,
    label: "✅ I've Completed This Offer",
    message: 'Click below to confirm you completed all offer steps',
    url: '',
    useOfferLink: true,
  },
  {
    id: 'submit',
    type: 'submit_form',
    enabled: false,
    label: '📝 Submit Proof Form',
    message: 'Upload your proof to speed up cashback approval',
    url: '',
    useOfferLink: false,
  },
  {
    id: 'contact',
    type: 'contact_us',
    enabled: true,
    label: '🎧 Contact Support',
    message: 'Having trouble? Our team is here to help',
    url: '',
    useOfferLink: false,
  },
];

// ─── Referral ─────────────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  referrerUpi: string;
  referredUpi: string;
  offerName: string;
  bonusPaid: boolean;
  createdAt: string;
}

// ─── Referrer Form Builder (per-offer dynamic form) ───────────────────────────

export type ReferrerFieldType = 'text' | 'number' | 'email' | 'tel' | 'dropdown';

export interface ReferrerFormField {
  id: string;
  label: string;
  type: ReferrerFieldType;
  required: boolean;
  placeholder?: string;
  validationRegex?: string;
  validationMessage?: string;
  options?: string[]; // For dropdown type — comma-separated or array
}

// ─── Referral Link Record ─────────────────────────────────────────────────────

export interface ReferralLinkRecord {
  id: string;
  referrerName: string;
  offerName: string;
  offerSlug: string;
  referralCode: string;
  customReferrerData: string; // JSON string
  linkStatus: 'Active' | 'Revoked';
  clickCount: number;
  referrerSplit: string;
  createdAt: string;
}

// ─── Social Media Link ────────────────────────────────────────────────────────

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  iconUrl: string;
}

// ─── Lead Field Config ────────────────────────────────────────────────────────

export interface LeadFieldDef {
  id: string;
  label: string;
  placeholder: string;
  type: 'text' | 'tel' | 'email' | 'number';
  required: boolean;
  enabled: boolean;
  isDefault: boolean;
  searchable?: boolean; // 🔎 When true, users can search by this field in the tracker
}

export const DEFAULT_LEAD_FIELDS: LeadFieldDef[] = [
  { id: 'upiId', label: 'UPI ID', placeholder: 'yourname@upi (to receive cashback)', type: 'text', required: true, enabled: true, isDefault: true, searchable: true },
  { id: 'name', label: 'Full Name', placeholder: 'Your name as used during offer sign-up', type: 'text', required: true, enabled: true, isDefault: true, searchable: true },
  { id: 'mobile', label: 'Mobile Number', placeholder: '10-digit number used during sign-up', type: 'tel', required: true, enabled: true, isDefault: true, searchable: true },
  { id: 'email', label: 'Email ID', placeholder: 'Email used during sign-up', type: 'email', required: false, enabled: true, isDefault: true, searchable: true },
];

// ─── Global Promo Popup ───────────────────────────────────────────────────────

export interface PromoPopupConfig {
  imageUrl: string;
  title: string;
  buttonText: string;
  redirectLink: string;
  isActive: boolean;
}

// ─── Cashback Forms (Standalone) ─────────────────────────────────────────────

export type CashbackFieldType =
  | 'text' | 'number' | 'email' | 'tel' | 'date' | 'file' | 'textarea' | 'select';

export interface CashbackFormField {
  id: string;
  label: string;
  type: CashbackFieldType;
  required: boolean;
  placeholder?: string;
  options?: string;
  order: number;
  isDefault?: boolean;
  enabled?: boolean;
}

export interface CashbackForm {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  fields: CashbackFormField[];
  logoUrl?: string;
  bannerUrl?: string;
  sampleScreenshotUrl?: string; // Admin uploads sample to instruct users
  createdAt?: string;
  // New fields for standalone routing & partner embed
  slug?: string;
  isPublic?: boolean;       // true = General (public listing), false = Private (link-only)
  partnerLink?: string;     // External partner form URL
  isEmbed?: boolean;        // true = render partnerLink inside an iframe
}

// ─── God-Mode UI Customization Engine ────────────────────────────────────────

export type UIButtonAnimation = 'none' | 'pulse' | 'bounce' | 'glow' | 'shake';
export type UIButtonSize = 'sm' | 'md' | 'lg' | 'xl';
export type UIButtonAlign = 'left' | 'center' | 'right' | 'full';

export interface UIButtonConfig {
  id: string;
  name: string;           // Admin-readable label (e.g. "Hero CTA")
  text: string;           // Button label text
  href: string;           // Destination: internal route or external URL
  bgColor: string;        // Hex or CSS keyword
  textColor: string;      // Hex
  borderColor: string;    // Hex or "transparent"
  hoverBgColor: string;   // Hex
  size: UIButtonSize;
  align: UIButtonAlign;
  animation: UIButtonAnimation;
  enabled: boolean;
}

// ── God-Mode: Brand Config ────────────────────────────────────────────────────
export interface UIBrandConfig {
  siteName: string;
  webLogoUrl: string;
  faviconUrl: string;
}

export const DEFAULT_UI_BRAND: UIBrandConfig = {
  siteName: '',
  webLogoUrl: '',
  faviconUrl: '',
};

// ── God-Mode: Hero Config ─────────────────────────────────────────────────────
export interface TrustPill {
  icon: string;
  label: string;
}

export interface UIHeroConfig {
  show: boolean;
  headlineLine1: string;
  headlineLine2: string;
  subHeadline: string;
  subHeadlineMobile: string;
  badgeText: string;
  trustPills: TrustPill[];
}

export const DEFAULT_UI_HERO: UIHeroConfig = {
  show: true,
  headlineLine1: "India's #1 Platform",
  headlineLine2: 'to Earn Online',
  subHeadline: 'Complete simple tasks — open accounts, install apps, invest — and withdraw real money directly to your UPI. Zero investment. Zero tricks.',
  subHeadlineMobile: 'Earn cashback on every offer. Withdraw to your UPI. Zero investment.',
  badgeText: '10,000+ Active Earners Right Now',
  trustPills: [
    { icon: '✅', label: 'Verified Payouts' },
    { icon: '⚡', label: 'Same-Day Transfer' },
    { icon: '🔒', label: '100% Secure' },
    { icon: '💰', label: 'Direct UPI' },
  ],
};

// ── God-Mode: Ticker Config ───────────────────────────────────────────────────
export interface UITickerConfig {
  show: boolean;
  label: string;
  customText: string;
}

export const DEFAULT_UI_TICKER: UITickerConfig = {
  show: true,
  label: '',
  customText: '',
};

// ── God-Mode: Offer Grid Config ───────────────────────────────────────────────
export interface UIOfferGridConfig {
  columns: '2' | '3' | '4';
  categories: string[];
}

export const DEFAULT_UI_OFFER_GRID: UIOfferGridConfig = {
  columns: '3',
  categories: [],
};

// ── God-Mode: Active Cashback Offers Config ───────────────────────────────────
export interface UIActiveOffersConfig {
  show: boolean;
  heading: string;
  subtitle: string;
  badgeLiveNow: string;
  badgeActive: string;
}

export const DEFAULT_UI_ACTIVE_OFFERS: UIActiveOffersConfig = {
  show: true,
  heading: 'Active Cashback Offers',
  subtitle: 'Pick an offer → complete the task → get cashback directly to your UPI',
  badgeLiveNow: 'Live Now',
  badgeActive: 'Active',
};

// ── God-Mode: Full UI Config ──────────────────────────────────────────────────
export interface UIConfig {
  buttons: UIButtonConfig[];
  brand: UIBrandConfig;
  hero: UIHeroConfig;
  ticker: UITickerConfig;
  offerGrid: UIOfferGridConfig;
  activeOffers: UIActiveOffersConfig;
}

export const DEFAULT_UI_BUTTONS: UIButtonConfig[] = [
  {
    id: 'hero-cta',
    name: '🦸 Hero Section — Primary CTA',
    text: '🎯 Live Offers',
    href: '#offers',
    bgColor: '#6366f1',
    textColor: '#ffffff',
    borderColor: 'transparent',
    hoverBgColor: '#4f46e5',
    size: 'lg',
    align: 'center',
    animation: 'pulse',
    enabled: true,
  },
  {
    id: 'lead-track-cta',
    name: '🔍 Hero Section — Track Lead CTA',
    text: '🔍 Track Lead',
    href: '/user-lead-track',
    bgColor: '#1e293b',
    textColor: '#ffffff',
    borderColor: '#334155',
    hoverBgColor: '#0f172a',
    size: 'lg',
    align: 'center',
    animation: 'none',
    enabled: true,
  },
  {
    id: 'nav-earn-cta',
    name: '🧭 Navbar — Earn Button',
    text: '🎯 Start Earning →',
    href: '#offers',
    bgColor: '#6366f1',
    textColor: '#ffffff',
    borderColor: 'transparent',
    hoverBgColor: '#4f46e5',
    size: 'sm',
    align: 'right',
    animation: 'none',
    enabled: true,
  },
  {
    id: 'offer-apply',
    name: '🎁 Offer Card — Apply Button',
    text: '⚡ Claim Now',
    href: '',
    bgColor: '#f0b429',
    textColor: '#000000',
    borderColor: 'transparent',
    hoverBgColor: '#ff5722',
    size: 'md',
    align: 'full',
    animation: 'none',
    enabled: true,
  },
  {
    id: 'cashback-form-cta',
    name: '💰 Cashback Section — Submit CTA',
    text: '📝 Submit Cashback Form Now',
    href: '#cashback-forms',
    bgColor: '#f0b429',
    textColor: '#000000',
    borderColor: 'transparent',
    hoverBgColor: '#ff5722',
    size: 'lg',
    align: 'center',
    animation: 'glow',
    enabled: true,
  },
];

export const DEFAULT_CASHBACK_FORM_FIELDS: CashbackFormField[] = [
  { id: 'df_upi',        label: 'UPI ID',                      type: 'text',  required: true,  placeholder: 'yourname@upi (cashback receiver)', options: '', order: 0, isDefault: true, enabled: true },
  { id: 'df_name',       label: 'Name (Use During Offer)',      type: 'text',  required: true,  placeholder: 'Your name used during sign-up',    options: '', order: 1, isDefault: true, enabled: true },
  { id: 'df_phone',      label: 'Phone No. (Use During Offer)', type: 'tel',   required: true,  placeholder: '10-digit number used during offer', options: '', order: 2, isDefault: true, enabled: true },
  { id: 'df_email',      label: 'EMAIL (Use During Offer)',     type: 'email', required: true,  placeholder: 'Email used during offer',           options: '', order: 3, isDefault: true, enabled: true },
  { id: 'df_screenshot', label: 'Offer SCREENSHOT',             type: 'file',  required: true,  placeholder: '',                                  options: '', order: 4, isDefault: true, enabled: true },
];

export interface CashbackSubmission {
  id: string;
  referenceId: string;
  formTitle: string;
  submissionData: string;
  submittedAt: string;
}

// ─── Legacy form builder (kept for backward compat) ──────────────────────────

export const DEFAULT_FORM_FIELDS: FormField[] = [
  { id: 'f1', label: 'UPI ID (Receive Cashback Here)', type: 'text',  required: true,  visible: true, placeholder: 'yourname@upi' },
  { id: 'f2', label: 'Full Name',                      type: 'text',  required: true,  visible: true, placeholder: 'Your full name' },
  { id: 'f3', label: 'Mobile Number',                  type: 'tel',   required: true,  visible: true, placeholder: '10-digit number' },
  { id: 'f4', label: 'Email ID',                       type: 'email', required: false, visible: true, placeholder: 'you@email.com' },
  { id: 'f5', label: 'Investment/Transaction Date',    type: 'date',  required: false, visible: true },
  { id: 'f6', label: 'Upload Proof Screenshot',        type: 'file',  required: false, visible: true },
];

export const DEFAULT_FORM_CONFIG: FormConfig = {
  enabled: false,
  title: 'Cashback Form',
  posterUrl: '',
  submitButtonText: 'Submit & Claim Cashback',
  submitConditions: [
    'You have completed the required task',
    'Screenshot is clear and readable',
    'All details match your account',
  ],
  fields: DEFAULT_FORM_FIELDS,
};
