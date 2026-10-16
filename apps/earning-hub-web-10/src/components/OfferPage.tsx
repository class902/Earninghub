import { appPath } from '@/lib/appUrl';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { submitLead } from 'zitejs/api';
import { toast } from 'sonner';
import WiFiWarning from '@/components/WiFiWarning';
import RecaptchaWidget from '@/components/RecaptchaWidget';
import PosterLightbox from '@/components/PosterLightbox';
import { useAppContext } from '@/contexts/AppContext';
import type { Offer, LeadFieldDef } from '@/types';
import { DEFAULT_LEAD_FIELDS } from '@/types';
import { slugify } from '@/utils/slugify';

// ── Field helpers ──────────────────────────────────────────────────────────────
function isUpiField(f: LeadFieldDef) { return f.id.includes('upi') || f.label.toLowerCase().includes('upi'); }
function isNameField(f: LeadFieldDef) { return f.id.includes('name') || f.label.toLowerCase().includes('name'); }
function isMobileField(f: LeadFieldDef) { return f.type === 'tel' || f.id.includes('mobile') || f.label.toLowerCase().includes('mobile') || f.label.toLowerCase().includes('phone'); }
function isEmailField(f: LeadFieldDef) { return f.type === 'email' || f.label.toLowerCase().includes('email'); }
function toTitleCase(s: string) { return s.replace(/\b[a-z]/g, c => c.toUpperCase()); }
function getFieldError(f: LeadFieldDef, val: string): string | null {
  const v = val.trim();
  if (f.required && !v) return 'Required';
  if (!v) return null;
  if (isUpiField(f) && !v.includes('@')) return 'Must contain "@"';
  if (isEmailField(f) && !v.includes('@')) return 'Must contain "@"';
  if (isMobileField(f) && !/^\d{10}$/.test(v)) return '10 digits only';
  if (isNameField(f) && !/^[a-zA-Z\s]+$/.test(v)) return 'Letters only';
  return null;
}
function getSocialBg(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return 'linear-gradient(135deg, #0088cc, #006699)';
  if (n.includes('whatsapp')) return 'linear-gradient(135deg, #25d366, #128c7e)';
  if (n.includes('instagram')) return 'linear-gradient(135deg, #f77737, #e1306c, #405de6)';
  if (n.includes('youtube')) return 'linear-gradient(135deg, #ff0000, #cc0000)';
  if (n.includes('support') || n.includes('help')) return 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
  return 'linear-gradient(135deg, hsl(var(--primary)), #f0b429)';
}
function getSocialIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('telegram')) return '✈';
  if (n.includes('whatsapp')) return '💬';
  if (n.includes('instagram')) return '📷';
  if (n.includes('youtube')) return '▶';
  if (n.includes('support')) return '🎧';
  return '🔗';
}

interface Props {
  offer: Offer;
  onClose: () => void;
  leadFieldsConfig?: LeadFieldDef[];
  wifiWarningBannerUrl?: string;
  telegramLink?: string;
  supportEmail?: string;
  isPrivateLead?: boolean; // true when page is accessed via a Private Campaign link
  referralCode?: string; // ── CHANGES: Pass referral code from cookie/URL ──
}

const DEFAULT_TERMS = [
  'Cashback is processed within 24 hours of offer completion and verification.',
  'Users must complete the required task exactly as specified by the brand.',
  'Only one cashback per offer per unique user account is allowed.',
  'Cashback is transferred to the UPI ID provided — ensure it is correct.',
  'EarningHub reserves the right to verify and reject fraudulent submissions.',
  'By submitting, you confirm that all information provided is accurate.',
];

// ── Offer Urgency Badges (Timer + Slots) ──────────────────────────────────────
function OfferUrgencyBadges({ offer }: { offer: Offer }) {
  const [countdown, setCountdown] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!offer.expiresAt) return;
    function update() {
      const diff = new Date(offer.expiresAt!).getTime() - Date.now();
      if (diff <= 0) { setCountdown('EXPIRED'); setUrgent(true); return; }
      const h = Math.floor(diff / 3600000);
      const d = Math.floor(h / 24);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setUrgent(h < 24);
      if (d >= 2) setCountdown(`${d} days left`);
      else if (h >= 1) setCountdown(`${h}h ${m}m left`);
      else setCountdown(`${m}m ${s}s left`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [offer.expiresAt]);

  const hasSlots = (offer.totalSlots || 0) > 0;
  const remaining = hasSlots ? Math.max(0, offer.totalSlots - (offer.filledSlots || 0)) : 0;
  const pct = hasSlots ? Math.min(100, ((offer.filledSlots || 0) / offer.totalSlots) * 100) : 0;
  const almostFull = hasSlots && remaining <= Math.ceil(offer.totalSlots * 0.2);

  if (!offer.expiresAt && !hasSlots) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mb-4">
      {offer.expiresAt && countdown && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ borderColor: urgent ? 'rgba(239,68,68,0.4)' : 'rgba(240,180,41,0.35)', background: urgent ? 'rgba(239,68,68,0.06)' : 'rgba(240,180,41,0.06)' }}>
          <motion.span animate={urgent ? { rotate: [0, -10, 10, 0] } : {}} transition={{ repeat: Infinity, duration: 2, repeatDelay: 2 }}>
            {urgent ? '⏰' : '⏳'}
          </motion.span>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: urgent ? '#ef4444' : '#f0b429' }}>Limited Time</p>
            <motion.p className="font-syne font-black text-base leading-none" style={{ color: urgent ? '#ef4444' : '#f0b429' }}
              animate={urgent ? { opacity: [1, 0.6, 1] } : {}} transition={{ repeat: Infinity, duration: 1.2 }}>
              {countdown}
            </motion.p>
          </div>
        </div>
      )}
      {hasSlots && (
        <div className="px-4 py-3 rounded-xl border"
          style={{ borderColor: almostFull ? 'rgba(239,68,68,0.4)' : 'rgba(240,180,41,0.3)', background: almostFull ? 'rgba(239,68,68,0.06)' : 'rgba(240,180,41,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <motion.span className="text-xs font-black" style={{ color: almostFull ? '#ef4444' : '#f0b429' }}
              animate={almostFull ? { scale: [1, 1.05, 1] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
              🔥 Only {remaining}/{offer.totalSlots} slots left
            </motion.span>
            {almostFull && <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>FILLING FAST</span>}
          </div>
          <div className="h-2 rounded-full bg-border/30 overflow-hidden">
            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8 }}
              style={{ background: almostFull ? 'linear-gradient(90deg, #ef4444, #dc2626)' : 'linear-gradient(90deg, #f0b429, #ff5722)' }} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function OfferPage({ offer, onClose, leadFieldsConfig, wifiWarningBannerUrl, telegramLink, supportEmail, isPrivateLead, referralCode: refCodeProp }: Props) {
  const { settings } = useAppContext();
  const allSocialLinks = settings?.socialLinks || [];
  const effectiveTelegram = telegramLink || settings?.telegramLink || '';
  const effectiveSupport = supportEmail || settings?.supportEmail || '';
  const siteName = settings?.siteName || 'EarningHub';
  const [posterLightboxOpen, setPosterLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  // Determine effective WiFi banner — respect per-offer "Use Global" toggle
  const effectiveWifiBanner = useMemo(() => {
    try {
      const cfg = JSON.parse(offer.fieldsConfig || '{}');
      if (cfg && typeof cfg === 'object' && !Array.isArray(cfg)) {
        if (cfg.useGlobalWifiBanner !== false) {
          // Use global banner from settings
          return wifiWarningBannerUrl || settings?.wifiWarningBannerUrl || '';
        }
      }
    } catch {}
    // Per-offer custom banner or fallback to prop
    return wifiWarningBannerUrl || '';
  }, [offer.fieldsConfig, wifiWarningBannerUrl, settings?.wifiWarningBannerUrl]);

  const offerSpecificFields = useMemo<LeadFieldDef[] | null>(() => {
    if (!offer.fieldsConfig) return null;
    try {
      const p = JSON.parse(offer.fieldsConfig);
      // New wrapper format: { fields: [...], showPayoutToUser: bool }
      if (!Array.isArray(p) && p?.fields && Array.isArray(p.fields) && p.fields.length > 0) {
        return p.fields as LeadFieldDef[];
      }
      // Legacy plain-array format
      if (Array.isArray(p) && p.length > 0 && typeof p[0]?.id === 'string') return p as LeadFieldDef[];
    } catch {}
    return null;
  }, [offer.fieldsConfig]);

  // Read admin-configured default expand states from fieldsConfig
  const expandDefaults = useMemo(() => {
    try {
      const p = JSON.parse(offer.fieldsConfig || '{}');
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        return { termsExpanded: Boolean(p.termsExpanded), stepsExpanded: Boolean(p.stepsExpanded) };
      }
    } catch {}
    return { termsExpanded: false, stepsExpanded: false };
  }, [offer.fieldsConfig]);

  const activeFields = (offerSpecificFields || leadFieldsConfig || DEFAULT_LEAD_FIELDS).filter(f => f.enabled);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showWifi, setShowWifi] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [showSteps, setShowSteps] = useState(expandDefaults.stepsExpanded);
  const [showTnC, setShowTnC] = useState(expandDefaults.termsExpanded);
  const [fabVisible, setFabVisible] = useState(false);

  // Parse steps — support structured JSON from fieldsConfig or plain text
  const parsedStructuredData = useMemo(() => {
    try {
      const fc = JSON.parse(offer.fieldsConfig || '{}');
      if (fc && typeof fc === 'object' && !Array.isArray(fc)) {
        return {
          structuredSteps: Array.isArray(fc.structuredSteps) ? fc.structuredSteps as { text: string; imageUrl?: string }[] : null,
          structuredTerms: Array.isArray(fc.structuredTerms) ? fc.structuredTerms as { text: string; imageUrl?: string }[] : null,
        };
      }
    } catch {}
    return { structuredSteps: null, structuredTerms: null };
  }, [offer.fieldsConfig]);

  const steps = useMemo(() => {
    if (parsedStructuredData.structuredSteps && parsedStructuredData.structuredSteps.length > 0) {
      return parsedStructuredData.structuredSteps.filter(s => s.text?.trim());
    }
    return offer.steps ? offer.steps.split('\n').filter(Boolean).map(s => ({ text: s.replace(/^\d+\.\s*/, ''), imageUrl: '' })) : [];
  }, [offer.steps, parsedStructuredData.structuredSteps]);

  const tags = offer.tags ? offer.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  // Parse terms — handle structured JSON, plain JSON array, or newline-separated text
  const termsToShow = useMemo<{ text: string; imageUrl?: string }[]>(() => {
    // First try structured terms from fieldsConfig
    if (parsedStructuredData.structuredTerms && parsedStructuredData.structuredTerms.length > 0) {
      return parsedStructuredData.structuredTerms.filter(t => t.text?.trim());
    }
    // Then try termsAndConditions field
    if (offer.termsAndConditions) {
      try {
        const parsed = JSON.parse(offer.termsAndConditions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'object' && 'text' in parsed[0]) {
            return parsed.filter((t: any) => t.text?.trim()).map((t: any) => ({ text: t.text, imageUrl: t.imageUrl || '' }));
          }
          if (typeof parsed[0] === 'string') {
            return parsed.filter(Boolean).map((t: string) => ({ text: t }));
          }
        }
      } catch {}
      // Plain newline-separated text
      const lines = offer.termsAndConditions.split('\n').map(t => t.trim()).filter(Boolean);
      if (lines.length > 0) return lines.map(t => ({ text: t }));
    }
    return DEFAULT_TERMS.map(t => ({ text: t }));
  }, [offer.termsAndConditions, parsedStructuredData.structuredTerms]);
  const offerSlug = slugify(offer.name);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Show FAB after a short delay so it doesn't compete with page entrance
    const t = setTimeout(() => setFabVisible(true), 800);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, []);

  function setVal(key: string, v: string) {
    setValues(p => ({ ...p, [key]: v }));
    setErrors(e => ({ ...e, [key]: '' }));
  }

  function handleSmartChange(f: LeadFieldDef, raw: string) {
    let v = raw;
    if (isNameField(f)) { v = v.replace(/[^a-zA-Z\s]/g, ''); v = toTitleCase(v); }
    if (isMobileField(f)) { v = v.replace(/\D/g, '').slice(0, 10); }
    setVal(f.id, v);
  }

  async function handleSubmit() {
    if (!captchaVerified) { toast.error('Please complete the reCAPTCHA verification first'); return; }
    const errs: Record<string, string> = {};
    activeFields.forEach(f => {
      const err = getFieldError(f, values[f.id] || '');
      if (err) errs[f.id] = err;
    });
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Please fix the highlighted fields'); return; }
    setLoading(true);
    try {
      const labeled: Record<string, string> = {};
      activeFields.forEach(f => { labeled[f.label] = values[f.id] || ''; });
      const summary = values['name'] || values['upiId'] || Object.values(values)[0] || '';
      const upiValue = (values['upiId'] || '').trim();
      const referredBy = sessionStorage.getItem('eh_referrer') || undefined;
      // ── CHANGES: Use prop referral code, fallback to sessionStorage/cookie ──
      const referralCode = refCodeProp || sessionStorage.getItem('eh_ref_code') || (() => {
        const m = document.cookie.match(/(?:^|;\s*)eh_ref_code=([^;]*)/);
        return m ? decodeURIComponent(m[1]) : '';
      })() || undefined;
      const res = await submitLead({
        offerName: offer.name, offerPayout: offer.payout, summary,
        leadData: JSON.stringify(labeled), upiId: upiValue, referredBy,
        referralCode: referralCode || undefined,
        isPrivateLead: isPrivateLead || false,
      });
      if (res.isDuplicate) {
        window.location.href = appPath(`/user-lead-track?upi=${encodeURIComponent(upiValue)}`);
      } else if (isValidLink) {
        window.location.href = offer.redirectLink;
      } else {
        toast.success('Lead saved! But offer link is not configured — contact support.');
      }
    } catch {
      toast.error('Submission failed. Please try again.');
      setLoading(false);
    }
  }

  const isValidLink = /^https?:\/\/.+/i.test(offer.redirectLink || '');

  function handleDirectRedirect() {
    if (!isValidLink) { toast.error('Offer link is not configured yet. Please check back later.'); return; }
    setShowWifi(true);
  }

  // ── Persistent "Track My Cashback" FAB — rendered via portal to avoid transform stacking ──
  const trackFab = createPortal(
    <AnimatePresence>
      {fabVisible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="fixed bottom-6 left-5 z-[200]"
        >
          <Link
            to={`/${offerSlug}/user-lead-track`}
            className="relative group flex items-center gap-2 font-syne font-black text-sm text-white transition-all hover:-translate-y-1 active:scale-95"
            style={{
              padding: '11px 18px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, hsl(213,94%,52%) 0%, hsl(213,94%,38%) 100%)',
              boxShadow: '0 8px 32px rgba(59,130,246,0.5), 0 0 0 1px rgba(59,130,246,0.25)',
            }}
          >
            <span className="text-base">🔍</span>
            <span className="hidden sm:inline whitespace-nowrap">Track My Cashback</span>
            {/* Pulse ring */}
            <motion.span
              className="absolute inset-0 rounded-full pointer-events-none border border-blue-400/50"
              animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 2.4 }}
            />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-50 bg-background overflow-y-auto"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 glass-nav px-4 md:px-8 py-3 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl flex items-center justify-center text-base shadow-lg bg-gradient-to-br from-primary to-blue-400">
              <span>💰</span>
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md -z-10" />
            </div>
            <span className="font-syne font-black text-lg text-foreground">
              {siteName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold hidden sm:inline px-3 py-1 bg-card border border-border rounded-full">
              Offer Details
            </span>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all text-sm font-semibold"
            >
              <X size={14} /><span>Close</span>
            </button>
          </div>
        </div>

        {/* Ambient blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="blob w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] absolute -top-[15%] -right-[15%] bg-primary opacity-[0.04]" />
          <div className="blob w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] absolute -bottom-[10%] -left-[10%] bg-blue-400 opacity-[0.04]" />
        </div>

        {/* ── PAGE CONTENT ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="relative z-10 max-w-2xl mx-auto px-4 md:px-8 py-6 pb-28"
        >
          {/* ── 1. Offer Banner ── */}
          {offer.bannerUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="relative rounded-3xl overflow-hidden mb-6 cursor-pointer"
              style={{ height: 220, boxShadow: '0 16px 48px rgba(0,0,0,0.45)' }}
              onClick={() => setPosterLightboxOpen(true)}
            >
              <img src={offer.bannerUrl} alt={offer.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-6 py-5">
                <span className="text-xs font-black text-white/60 uppercase tracking-widest">{offer.category}</span>
                <p className="font-syne font-black text-2xl text-white leading-tight mt-1">{offer.name}</p>
              </div>
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                <span className="text-[10px] font-black text-white uppercase tracking-wider">Live</span>
              </div>
            </motion.div>
          )}

          {/* ── 1b. Timer + Slots (if set) ── */}
          <OfferUrgencyBadges offer={offer} />

          {/* ── 2. Offer Info Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-card border border-border rounded-2xl p-5 mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.05) 0%, transparent 100%)' }}
          >
            {!offer.bannerUrl && (
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden shadow-sm">
                  {offer.logoUrl
                    ? <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover rounded-2xl" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                    : <span className="text-sm font-black text-primary leading-none select-none">
                        {offer.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                      </span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-syne font-black text-xl text-foreground leading-tight">{offer.name}</h1>
                    <span className="flex items-center gap-1 bg-green-500/15 border border-green-500/30 text-green-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />LIVE
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{offer.category}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/15 mb-4">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Cashback Reward</p>
                <span className="font-syne font-black text-3xl text-gold">{(offer as any).payoutDisplay || `₹${offer.payout}`}</span>
              </div>
              <div className="text-right space-y-1.5">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-[10px] font-bold text-green-400">Within 24 hrs</span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-bold text-blue-400">UPI Direct</span>
                </div>
              </div>
            </div>

            {offer.description && (
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{offer.description}</p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span key={tag} className="text-[10px] font-bold text-muted-foreground bg-background border border-border px-2.5 py-1 rounded-full">
                    ✔ {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── 3. Lead Collection Form / Direct CTA ── (CONVERSION BLOCK — right after offer info) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="bg-card border border-border rounded-2xl p-5 mb-5"
          >
            {offer.leadConfigEnabled !== false ? (
              <>
                <div className="flex items-center gap-3 pb-4 border-b border-border mb-5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-base flex-shrink-0">📋</div>
                  <div>
                    <p className="font-syne font-black text-foreground">Submit Your Details</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Fill in the info used while completing this offer to claim cashback</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Validation hint */}
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-primary/20 bg-primary/5">
                    <span className="text-primary flex-shrink-0 text-xs">🛡️</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <strong className="text-primary">Zero-Fraud:</strong> UPI & Email must contain <strong>@</strong>. Name = letters only. Mobile = 10 digits.
                    </p>
                  </div>

                  {activeFields.map((f, i) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.22 + i * 0.04 }}
                    >
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        {f.label} {f.required && <span className="text-destructive">*</span>}
                        {isUpiField(f) && <span className="text-[9px] text-muted-foreground/60 font-normal normal-case">must contain @</span>}
                        {isMobileField(f) && <span className="text-[9px] text-muted-foreground/60 font-normal normal-case">10 digits</span>}
                      </label>
                      <input
                        type={isMobileField(f) ? 'tel' : f.type}
                        inputMode={isMobileField(f) ? 'numeric' : f.type === 'email' ? 'email' : undefined}
                        value={values[f.id] || ''}
                        onChange={e => handleSmartChange(f, e.target.value)}
                        maxLength={isMobileField(f) ? 10 : undefined}
                        placeholder={f.placeholder}
                        className={`w-full px-4 py-3.5 bg-background border rounded-xl text-foreground text-sm focus:outline-none transition-all font-satoshi placeholder:text-muted-foreground/40 ${
                          errors[f.id]
                            ? 'border-destructive bg-destructive/5'
                            : 'border-border focus:border-primary focus:shadow-[0_0_0_3px_rgba(59,130,246,0.07)]'
                        }`}
                      />
                      {errors[f.id] && (
                        <motion.p initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} className="text-destructive text-xs mt-1.5 flex items-center gap-1">
                          ⚠ {errors[f.id]}
                        </motion.p>
                      )}
                    </motion.div>
                  ))}

                  <RecaptchaWidget verified={captchaVerified} onVerify={() => setCaptchaVerified(true)} />

                  <motion.button
                    onClick={handleSubmit}
                    disabled={loading || !captchaVerified}
                    whileHover={!loading && captchaVerified ? { y: -2, scale: 1.01 } : {}}
                    whileTap={!loading && captchaVerified ? { scale: 0.98 } : {}}
                    className="relative w-full py-4 rounded-2xl font-syne font-black text-base text-white disabled:opacity-50 transition-all overflow-hidden"
                    style={{
                      background: captchaVerified && !loading ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, #60a5fa 100%)' : 'rgba(59,130,246,0.25)',
                      boxShadow: captchaVerified ? '0 8px 32px rgba(59,130,246,0.35), 0 0 0 1px rgba(59,130,246,0.15)' : 'none',
                    }}
                  >
                    {captchaVerified && !loading && <div className="card-shine" />}
                    {loading
                      ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin flex-shrink-0" />
                          Saving &amp; Redirecting…
                        </span>
                      )
                      : !captchaVerified
                        ? '☐ Complete verification above'
                        : '🎁 Submit & Continue to Offer →'}
                  </motion.button>

                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                    🔒 Used only for cashback verification. 100% secure.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl mx-auto mb-4">🚀</div>
                <p className="font-syne font-black text-foreground text-lg mb-1">Ready to Claim?</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {isValidLink
                    ? <>Click below to go to the partner page and complete the offer to earn{' '}<strong className="text-gold">{(offer as any).payoutDisplay || `₹${offer.payout}`}</strong> cashback.</>
                    : 'This offer link is being set up. Please check back shortly or contact support.'}
                </p>
                <motion.button
                  onClick={handleDirectRedirect}
                  disabled={!isValidLink}
                  whileHover={isValidLink ? { y: -2, scale: 1.01 } : {}}
                  whileTap={isValidLink ? { scale: 0.98 } : {}}
                  className="relative w-full py-4 rounded-2xl font-syne font-black text-base text-white overflow-hidden disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #60a5fa 100%)', boxShadow: isValidLink ? '0 8px 32px rgba(59,130,246,0.35)' : 'none' }}
                >
                  {isValidLink && <div className="card-shine" />}
                  {isValidLink ? '🚀 Go to Offer →' : '⏳ Offer Link Coming Soon'}
                </motion.button>
              </div>
            )}
          </motion.div>

          {/* ── 4. Steps to Complete — COLLAPSED, at bottom ── */}
          {steps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mb-3 bg-card border border-border rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">📝</span>
                  <div className="text-left">
                    <p className="font-syne font-black text-sm text-foreground">How to Complete This Offer</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{steps.length} step{steps.length !== 1 ? 's' : ''}{showSteps ? '' : ' · tap to view'}</p>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 flex-shrink-0 ${showSteps ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showSteps && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
                      {steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-black flex-shrink-0 mt-px" style={{ fontSize: 10 }}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{step.text}</p>
                            {step.imageUrl && (
                              <img
                                src={step.imageUrl}
                                alt={`Step ${i + 1}`}
                                className="mt-2 rounded-lg border border-border max-h-40 object-cover cursor-pointer hover:opacity-90 hover:shadow-lg transition-all active:scale-[0.98]"
                                onClick={() => setLightboxImage({ src: step.imageUrl!, alt: `Step ${i + 1} — ${step.text}` })}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── 5. Terms & Conditions — COLLAPSED, at very bottom ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <button
              onClick={() => setShowTnC(!showTnC)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-base">📜</span>
                <div className="text-left">
                  <p className="font-syne font-black text-sm text-foreground">Terms & Conditions</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {termsToShow !== DEFAULT_TERMS.map(t => ({ text: t })) ? 'Custom T&C for this offer' : 'Read before submitting'}{showTnC ? '' : ' · tap to view'}
                  </p>
                </div>
              </div>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 flex-shrink-0 ${showTnC ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showTnC && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 space-y-2 border-t border-border pt-4">
                    {termsToShow.map((term, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <span className="text-primary font-black flex-shrink-0 mt-0.5">•</span>
                        <div className="flex-1 min-w-0">
                          <span className="leading-relaxed">{term.text}</span>
                          {term.imageUrl && (
                            <img
                              src={term.imageUrl}
                              alt={`Term ${i + 1}`}
                              className="mt-2 rounded-lg border border-border max-h-32 object-cover cursor-pointer hover:opacity-90 hover:shadow-lg transition-all active:scale-[0.98]"
                              onClick={() => setLightboxImage({ src: term.imageUrl!, alt: `Term ${i + 1} — ${term.text}` })}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {/* ── 6. Social Links (Telegram LEFT, Support RIGHT + all others) ── */}
          {(effectiveTelegram || effectiveSupport || allSocialLinks.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36 }}
              className="mt-3 rounded-2xl border border-border overflow-hidden bg-card"
            >
              {settings?.webLogoUrl && (
                <div className="px-4 pt-3 pb-2 border-b border-border/30 flex items-center justify-between">
                  <img src={settings.webLogoUrl} alt="Brand" className="h-6 w-auto object-contain" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stay Connected</span>
                </div>
              )}
              <div className={`p-3 grid gap-2 ${((effectiveTelegram ? 1 : 0) + (effectiveSupport ? 1 : 0) + allSocialLinks.length) >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {/* Telegram FIRST (LEFT) */}
                {effectiveTelegram && (
                  <a href={effectiveTelegram} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border hover:border-primary/40 transition-all group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base group-hover:scale-110 transition-transform"
                      style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}>✈</div>
                    <span className="text-[10px] font-black text-foreground">Telegram</span>
                  </a>
                )}
                {/* Support SECOND (RIGHT if only 2) */}
                {effectiveSupport && (
                  <a href={effectiveSupport.includes('@') ? `mailto:${effectiveSupport}` : effectiveSupport}
                    target="_blank" rel="noreferrer"
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border hover:border-primary/40 transition-all group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base group-hover:scale-110 transition-transform"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>🎧</div>
                    <span className="text-[10px] font-black text-foreground">Support</span>
                  </a>
                )}
                {/* All other social links */}
                {allSocialLinks.filter(sl => sl.url).map(sl => (
                  <a key={sl.id} href={sl.url} target="_blank" rel="noreferrer"
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-border hover:border-primary/40 transition-all group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base overflow-hidden group-hover:scale-110 transition-transform"
                      style={{ background: sl.iconUrl ? undefined : getSocialBg(sl.name) }}>
                      {sl.iconUrl ? <img src={sl.iconUrl} alt={sl.name} className="w-full h-full object-cover" /> : getSocialIcon(sl.name)}
                    </div>
                    <span className="text-[10px] font-black text-foreground truncate w-full text-center">{sl.name}</span>
                  </a>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {showWifi && (
          <WiFiWarning
            bannerUrl={effectiveWifiBanner}
            onConfirm={() => { setShowWifi(false); window.location.href = offer.redirectLink; }}
            onClose={() => setShowWifi(false)}
          />
        )}
      </motion.div>

      {/* ── Track My Cashback FAB — portaled to body to avoid transform clipping ── */}
      {trackFab}

      {/* Poster Lightbox */}
      {offer.bannerUrl && (
        <PosterLightbox src={offer.bannerUrl} alt={offer.name} open={posterLightboxOpen} onClose={() => setPosterLightboxOpen(false)} />
      )}

      {/* Step/Term image Lightbox */}
      {lightboxImage && (
        <PosterLightbox src={lightboxImage.src} alt={lightboxImage.alt} open={true} onClose={() => setLightboxImage(null)} />
      )}
    </>
  );
}
