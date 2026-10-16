import { appOrigin } from '@/lib/appUrl';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Input } from '@project/components/ui/input';
import { adminSaveOffer } from 'zitejs/api';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2, ImagePlus, Check, Pause, Zap, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Offer, LeadFieldDef, ReferrerFormField } from '@/types';
import { DEFAULT_LEAD_FIELDS } from '@/types';
import ImageUploadField from './ImageUploadField';
import LeadFieldsConfig from './LeadFieldsConfig';
import ReferrerFormBuilder from './ReferrerFormBuilder';
import { useAppContext } from '@/contexts/AppContext';
import { uploadFile } from 'zitejs/upload';

/* ─── Types ─── */
interface StepItem { id: string; text: string; imageUrl?: string }
interface TermItem { id: string; text: string; imageUrl?: string }

function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

/* ─── Constants ─── */
const CORE_CATEGORIES = ['Savings Account', 'Demat Account', 'Credit Card', 'Flash Deal'];
const DEFAULT_CATEGORIES = [...CORE_CATEGORIES, 'Custom'];

const POPULAR_EMOJIS = ['💰', '🎯', '💳', '📈', '🏦', '🔥', '⭐', '🎁', '💎', '🚀', '💸', '📱', '🛡️', '✅', '🤑', '💼', '📊', '🎉', '⚡', '🏆'];

/* ─── Props ─── */
interface Props { password: string; offer: Offer | null; onSaved: () => void; onSessionExpired?: () => void }

/* ─── Reusable ─── */

function SectionHeader({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="border-b border-border pb-3 mb-5">
      <p className="font-syne font-black text-sm text-foreground flex items-center gap-2"><span>{icon}</span> {title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Toggle({ value, onChange, label, sub }: { value: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between p-4 bg-background border border-border rounded-xl hover:border-primary/40 transition-all">
      <div className="text-left">
        <p className="font-syne font-black text-sm text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ml-4 ${value ? 'bg-primary' : 'bg-border'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

/* ─── Validated Input ─── */
function ValidatedInput({ value, onChange, placeholder, className, type, min, max, required, label, touched, onBlur }: {
  value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; className?: string; type?: string; min?: number; max?: number;
  required?: boolean; label?: string; touched?: boolean; onBlur?: () => void;
}) {
  const isEmpty = required && touched && String(value).trim() === '';
  return (
    <div>
      <Input value={value} onChange={onChange} placeholder={placeholder} type={type} min={min} max={max}
        onBlur={onBlur}
        className={`${className || ''} ${isEmpty ? 'border-destructive ring-1 ring-destructive/30' : ''}`} />
      {isEmpty && <p className="text-[10px] text-destructive mt-1 font-bold">{label || 'This field'} is required</p>}
    </div>
  );
}

/* ─── Inline Image Upload ─── */
function InlineImageUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setUploading(true);
    try {
      const { fileUrl } = await uploadFile({ data: file, filename: file.name });
      onChange(fileUrl); toast.success('Uploaded!');
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  }
  return (
    <div className="flex items-center gap-2">
      <input ref={ref} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={handleFile} />
      {value ? (
        <div className="flex items-center gap-2 px-2 py-1 bg-background border border-border rounded-lg">
          <img src={value} alt="" className="h-8 w-12 rounded object-cover border border-border" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <button type="button" onClick={() => onChange('')} className="text-destructive text-xs hover:text-destructive/80">✕</button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-all disabled:opacity-50">
          {uploading ? '⏳' : <><ImagePlus size={12} /> Photo</>}
        </button>
      )}
    </div>
  );
}

/* ─── List Builder (Steps / Terms) — stable IDs, move up/down ─── */
function ListBuilder({ items, onChange, addLabel, placeholder }: {
  items: Array<{ id: string; text: string; imageUrl?: string }>;
  onChange: (items: Array<{ id: string; text: string; imageUrl?: string }>) => void;
  addLabel: string; placeholder: string;
}) {
  function updateItem(id: string, patch: Partial<{ text: string; imageUrl: string }>) {
    onChange(items.map(it => it.id === id ? { ...it, ...patch } : it));
  }
  function removeItem(id: string) { onChange(items.filter(it => it.id !== id)); }
  function addItem() { onChange([...items, { id: uid(), text: '', imageUrl: '' }]); }
  function moveUp(idx: number) {
    if (idx <= 0) return;
    const next = [...items];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    onChange(next);
  }
  function moveDown(idx: number) {
    if (idx >= items.length - 1) return;
    const next = [...items];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="text-center py-6 border border-dashed border-border rounded-xl text-muted-foreground text-xs">
          No items added yet. Click the button below to start.
        </div>
      )}
      {items.map((item, idx) => (
        <motion.div key={item.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2.5 p-3 bg-background border border-border rounded-xl group hover:border-primary/30 transition-all">
          {/* Number + Reorder */}
          <div className="flex flex-col items-center gap-0.5 mt-1 flex-shrink-0">
            <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0}
              className="p-0.5 text-muted-foreground/40 hover:text-primary disabled:opacity-20 transition-colors"><ChevronUp size={12} /></button>
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">{idx + 1}</span>
            <button type="button" onClick={() => moveDown(idx)} disabled={idx === items.length - 1}
              className="p-0.5 text-muted-foreground/40 hover:text-primary disabled:opacity-20 transition-colors"><ChevronDown size={12} /></button>
          </div>
          {/* Content */}
          <div className="flex-1 space-y-2">
            <Input value={item.text} onChange={e => updateItem(item.id, { text: e.target.value })}
              placeholder={`${placeholder} ${idx + 1}`}
              className="bg-background border-border text-foreground text-sm" />
            {item.imageUrl && (
              <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded-lg">
                <img src={item.imageUrl} alt="" className="h-10 w-16 rounded object-cover border border-border flex-shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                <span className="text-[10px] text-muted-foreground flex-1 truncate min-w-0">Image attached</span>
                <button type="button" onClick={() => updateItem(item.id, { imageUrl: '' })} className="text-destructive text-xs flex-shrink-0 hover:text-destructive/80">✕</button>
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1.5 mt-2 flex-shrink-0">
            <InlineImageUpload value={item.imageUrl || ''} onChange={url => updateItem(item.id, { imageUrl: url })} />
            <button type="button" onClick={() => removeItem(item.id)}
              className="p-1.5 text-destructive/60 hover:text-destructive hover:bg-destructive/5 rounded-lg transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        </motion.div>
      ))}
      <button type="button" onClick={addItem}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-primary/30 rounded-xl text-primary text-xs font-black hover:bg-primary/5 hover:border-primary/50 transition-all">
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                               */
/* ═══════════════════════════════════════════════════════════════════════════════ */
export default function AddEditOffer({ password, offer, onSaved, onSessionExpired }: Props) {
  const { settings } = useAppContext();

  const CATEGORIES = useMemo(() => {
    try {
      const lc = JSON.parse(settings?.layoutConfig || '{}');
      if (Array.isArray(lc.offerCategories) && lc.offerCategories.length > 0) {
        const cats = lc.offerCategories as string[];
        return cats.includes('Custom') ? cats : [...cats, 'Custom'];
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  }, [settings?.layoutConfig]);

  /* ── State ── */
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💰');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [desc, setDesc] = useState('');
  const [payout, setPayout] = useState('');
  const [category, setCategory] = useState('Savings Account');
  const [customCategory, setCustomCategory] = useState('');
  const [tags, setTags] = useState('');
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('Active');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [adminPayout, setAdminPayout] = useState(0);
  const [userPayout, setUserPayout] = useState(0);
  const [payoutDisplay, setPayoutDisplay] = useState('');
  const [warningPopupActive, setWarningPopupActive] = useState(false);
  const [warningPopupImage, setWarningPopupImage] = useState('');
  const [useGlobalWifiBanner, setUseGlobalWifiBanner] = useState(true);
  const [offerLeadFields, setOfferLeadFields] = useState<LeadFieldDef[]>(DEFAULT_LEAD_FIELDS);
  const [showLeadFields, setShowLeadFields] = useState(false);
  const [showPayoutToUser, setShowPayoutToUser] = useState(false);
  const [stepItems, setStepItems] = useState<StepItem[]>([]);
  const [termItems, setTermItems] = useState<TermItem[]>([]);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [rank, setRank] = useState(0);
  const [expiresAt, setExpiresAt] = useState('');
  const [totalSlots, setTotalSlots] = useState(0);
  const [filledSlots, setFilledSlots] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privateSlug, setPrivateSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [referralEnabled, setReferralEnabled] = useState(false);
  const [referrerFormFields, setReferrerFormFields] = useState<ReferrerFormField[]>([]);
  const [showReferralSection, setShowReferralSection] = useState(false);
  const [referralAdminCut, setReferralAdminCut] = useState(0);
  const [referralReferrerCut, setReferralReferrerCut] = useState(0);
  const [referralUserEstimate, setReferralUserEstimate] = useState(0);
  const [saving, setSaving] = useState(false);

  /* ── Touched state for inline validation ── */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  function markTouched(field: string) { setTouched(prev => ({ ...prev, [field]: true })); }

  /* ── Dirty tracking for unsaved changes guard ── */
  const [isDirty, setIsDirty] = useState(false);
  const initialLoadRef = useRef(true);

  // Mark dirty on any state change after initial load
  useEffect(() => {
    if (initialLoadRef.current) return;
    setIsDirty(true);
  }, [name, emoji, desc, payout, category, customCategory, tags, link, status, logoUrl, bannerUrl,
    adminPayout, userPayout, payoutDisplay, warningPopupActive, warningPopupImage,
    showPayoutToUser, stepItems, termItems, stepsExpanded, termsExpanded, rank,
    expiresAt, totalSlots, filledSlots, isPrivate, privateSlug, referralEnabled,
    referralAdminCut, referralReferrerCut, referralUserEstimate]);

  // beforeunload guard
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /* ── Payout logic ── */
  const payoutNum = Number(payout) || 0;
  function handleTotalPayoutChange(val: string) {
    setPayout(val);
    const total = Number(val) || 0;
    if (total > 0 && userPayout === 0 && adminPayout === 0) {
      setUserPayout(Math.round(total * 0.8)); setAdminPayout(Math.round(total * 0.2));
    } else if (total > 0) {
      const oldTotal = adminPayout + userPayout;
      if (oldTotal > 0) { const nu = Math.round(userPayout * (total / oldTotal)); setUserPayout(nu); setAdminPayout(total - nu); }
    }
  }
  function handleUserPayoutChange(val: number) { setUserPayout(val); setAdminPayout(Math.max(0, payoutNum - val)); }
  function applySplit(adminPct: number) {
    if (payoutNum <= 0) return;
    const a = Math.round(payoutNum * adminPct); setAdminPayout(a); setUserPayout(payoutNum - a);
  }

  /* ── Parse helpers ── */
  function parseSteps(raw: string): StepItem[] {
    try { const p = JSON.parse(raw); if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'object' && 'text' in p[0]) return p.map((s: any) => ({ id: s.id || uid(), text: s.text, imageUrl: s.imageUrl || '' })); } catch {}
    if (!raw?.trim()) return [];
    return raw.split('\n').filter(l => l.trim()).map(line => ({ id: uid(), text: line.replace(/^\d+\.\s*/, '').trim(), imageUrl: '' }));
  }
  function parseTerms(raw: string): TermItem[] {
    try { const p = JSON.parse(raw); if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'object' && 'text' in p[0]) return p.map((t: any) => ({ id: t.id || uid(), text: t.text, imageUrl: t.imageUrl || '' })); } catch {}
    if (!raw?.trim()) return [];
    return raw.split('\n').filter(l => l.trim()).map(line => ({ id: uid(), text: line.replace(/^[•\-]\s*/, '').trim(), imageUrl: '' }));
  }

  const globalLeadFields = useMemo(() => {
    try { const cfg = settings?.leadFieldsConfig; if (cfg) { const p = JSON.parse(cfg); if (Array.isArray(p) && p.length > 0) return p as LeadFieldDef[]; } } catch {}
    return DEFAULT_LEAD_FIELDS;
  }, [settings?.leadFieldsConfig]);

  /* ── Load offer ── */
  useEffect(() => {
    initialLoadRef.current = true;
    setTouched({});
    if (offer) {
      setName(offer.name); setEmoji(offer.emoji || '💰'); setDesc(offer.description);
      setPayout(String(offer.payout));
      if (CORE_CATEGORIES.includes(offer.category)) { setCategory(offer.category); setCustomCategory(''); }
      else if (offer.category) { setCategory('Custom'); setCustomCategory(offer.category); }
      else { setCategory('Savings Account'); setCustomCategory(''); }
      setTags(offer.tags); setLink(offer.redirectLink); setStatus(offer.status || 'Active');
      setLogoUrl(offer.logoUrl || ''); setBannerUrl(offer.bannerUrl || '');
      setWarningPopupImage(offer.warningPopupImage || '');
      setWarningPopupActive(offer.warningPopupActive ?? false);
      setRank(offer.rank || 0);
      setExpiresAt(offer.expiresAt ? offer.expiresAt.slice(0, 16) : '');
      setTotalSlots(offer.totalSlots || 0); setFilledSlots(offer.filledSlots || 0);
      setIsPrivate(offer.isPrivate ?? false); setPrivateSlug(offer.privateSlug || '');
      setSlugManuallyEdited(Boolean(offer.privateSlug));
      setReferralEnabled(offer.referralEnabled ?? false);
      try { const rf = JSON.parse(offer.referrerFormConfig || '[]'); setReferrerFormFields(Array.isArray(rf) ? rf : []); } catch { setReferrerFormFields([]); }
      setReferralAdminCut((offer as any).referralAdminCut ?? 0);
      setReferralReferrerCut((offer as any).referralDefaultReferrerCut ?? 0);
      setReferralUserEstimate((offer as any).referralDefaultUserEstimate ?? 0);
      setPayoutDisplay((offer as any).payoutDisplay || '');
      setStepItems(parseSteps(offer.steps));
      setTermItems(parseTerms(offer.termsAndConditions || ''));
      // Load payout split from DB fields first, then fieldsConfig legacy
      const offerUserPay = (offer as any).userPayout;
      const offerAdminPay = (offer as any).adminPayout;
      try {
        const fc = JSON.parse(offer.fieldsConfig || '{}');
        if (fc && typeof fc === 'object' && !Array.isArray(fc)) {
          if (offerUserPay > 0 || offerAdminPay > 0) {
            setUserPayout(offerUserPay || 0);
            setAdminPayout(offerAdminPay || 0);
          } else {
            setAdminPayout(fc.adminPayout ?? Math.round(offer.payout * 0.2));
            setUserPayout(fc.userPayout ?? Math.round(offer.payout * 0.8));
          }
          setUseGlobalWifiBanner(fc.useGlobalWifiBanner !== false);
          setShowPayoutToUser(Boolean(fc.showPayoutToUser));
          setStepsExpanded(Boolean(fc.stepsExpanded)); setTermsExpanded(Boolean(fc.termsExpanded));
          if (Array.isArray(fc.fields) && fc.fields.length > 0) setOfferLeadFields(fc.fields);
          else setOfferLeadFields(DEFAULT_LEAD_FIELDS);
        } else if (Array.isArray(fc)) {
          if (fc.length > 0 && typeof fc[0]?.id === 'string') setOfferLeadFields(fc as LeadFieldDef[]);
          else setOfferLeadFields(DEFAULT_LEAD_FIELDS);
          setAdminPayout(Math.round(offer.payout * 0.2)); setUserPayout(Math.round(offer.payout * 0.8));
          setUseGlobalWifiBanner(true); setShowPayoutToUser(false);
        } else {
          setAdminPayout(Math.round(offer.payout * 0.2)); setUserPayout(Math.round(offer.payout * 0.8));
          setOfferLeadFields(DEFAULT_LEAD_FIELDS); setUseGlobalWifiBanner(true); setShowPayoutToUser(false);
        }
      } catch {
        setAdminPayout(Math.round(offer.payout * 0.2)); setUserPayout(Math.round(offer.payout * 0.8));
        setOfferLeadFields(DEFAULT_LEAD_FIELDS); setUseGlobalWifiBanner(true); setShowPayoutToUser(false);
      }
    } else {
      setName(''); setEmoji('💰'); setDesc(''); setPayout('');
      setCategory('Savings Account'); setCustomCategory(''); setTags(''); setLink(''); setStatus('Active');
      setLogoUrl(''); setBannerUrl('');
      setWarningPopupImage(''); setWarningPopupActive(false);
      setOfferLeadFields(DEFAULT_LEAD_FIELDS); setShowPayoutToUser(false);
      setStepItems([]); setTermItems([]);
      setRank(0); setExpiresAt(''); setTotalSlots(0); setFilledSlots(0);
      setIsPrivate(false); setPrivateSlug(''); setSlugManuallyEdited(false);
      setReferralEnabled(false); setReferrerFormFields([]);
      setReferralAdminCut(0); setReferralReferrerCut(0); setReferralUserEstimate(0);
      setPayoutDisplay(''); setStepsExpanded(false); setTermsExpanded(false);
      setAdminPayout(0); setUserPayout(0); setUseGlobalWifiBanner(true);
    }
    // Allow a tick for all state to settle, then enable dirty tracking
    setTimeout(() => { initialLoadRef.current = false; setIsDirty(false); }, 100);
  }, [offer]);

  useEffect(() => {
    if (isPrivate && !slugManuallyEdited && name.trim()) {
      setPrivateSlug(`${name.trim().replace(/\s+/g, '_')}_Special`);
    }
  }, [name, isPrivate, slugManuallyEdited]);

  /* ── Save ── */
  async function handleSave() {
    // Mark all required fields touched
    setTouched({ name: true, desc: true, link: true, payout: true });
    if (!name || !desc || !link || !payout) { toast.error('Fill all required fields.'); return; }
    if (!/^https?:\/\/.+/i.test(link.trim())) { toast.error('Partner Redirect Link must be a valid URL starting with http:// or https://'); return; }
    if (isPrivate && !privateSlug.trim()) { toast.error('Private campaigns require a custom slug.'); return; }
    setSaving(true);
    try {
      const stepsPlain = stepItems.filter(s => s.text.trim()).map((s, i) => `${i + 1}. ${s.text}`).join('\n');
      const termsJson = JSON.stringify(termItems.filter(t => t.text.trim()));
      const fieldsConfigPayload = JSON.stringify({
        fields: offerLeadFields, showPayoutToUser, termsExpanded, stepsExpanded,
        adminPayout, userPayout, useGlobalWifiBanner,
        structuredSteps: stepItems.filter(s => s.text.trim()),
        structuredTerms: termItems.filter(t => t.text.trim()),
      });
      await adminSaveOffer({
        password, id: offer?.id,
        name, emoji, description: desc, steps: stepsPlain,
        payout: Number(payout),
        category: category === 'Custom' ? (customCategory.trim() || 'Custom') : category,
        tags, redirectLink: link, status,
        fieldsConfig: fieldsConfigPayload,
        formEnabled: offer?.formEnabled || false, formConfig: offer?.formConfig || '{}',
        logoUrl, bannerUrl, sampleScreenshotUrl: '',
        warningPopupImage, warningPopupActive,
        leadConfigEnabled: true, termsAndConditions: termsJson, rank,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        totalSlots, filledSlots, isPrivate, privateSlug: isPrivate ? privateSlug.trim() : '',
        referralEnabled, referrerFormConfig: JSON.stringify(referrerFormFields),
        referralAdminCut, referralDefaultReferrerCut: referralReferrerCut,
        referralDefaultUserEstimate: referralUserEstimate,
        payoutDisplay: payoutDisplay.trim() || undefined,
        userPayout, adminPayout,
      } as any);
      toast.success(offer ? 'Offer updated!' : 'Offer created!');
      setIsDirty(false);
      onSaved();
    } catch (e) {
      const msg = String((e as { message?: string })?.message || '');
      if (msg.toLowerCase().includes('invalid password') || msg.toLowerCase().includes('unauthorized')) {
        toast.error('Session expired — please log out and log in again.'); onSessionExpired?.();
      } else { toast.error(msg ? `Error: ${msg}` : 'Failed to save offer.'); }
    } finally { setSaving(false); }
  }

  const inp = 'bg-background border-border text-foreground';
  const lbl = 'text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block';
  const payoutValid = payoutNum > 0 && Math.abs((adminPayout + userPayout) - payoutNum) < 1;

  return (
    <div className="pb-24">
      <div className="p-6 md:p-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h2 className="font-syne font-black text-2xl text-foreground flex items-center gap-2">
            {offer ? '✏️' : '➕'} {offer ? 'Edit Offer' : 'New Offer'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Configure offer details, branding, popups, and lead collection.</p>
          {isDirty && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-xs font-bold text-amber-500">Unsaved changes</p>
            </div>
          )}
        </div>

        <div className="space-y-6">

          {/* ═══ BASIC INFORMATION ═══ */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon="📋" title="Basic Information" />
            <div className="space-y-5">

              {/* Offer Name + Emoji Picker */}
              <div>
                <label className={lbl}>Offer Name *</label>
                <div className="flex gap-2">
                  {/* Emoji Picker */}
                  <div className="relative flex-shrink-0">
                    <button type="button" onClick={() => setShowEmojiPicker(v => !v)}
                      className="w-11 h-10 flex items-center justify-center text-lg bg-background border border-border rounded-xl hover:border-primary/40 transition-all">
                      {emoji || '💰'}
                    </button>
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          className="absolute top-12 left-0 z-50 bg-card border border-border rounded-xl p-3 shadow-xl w-[220px]">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Pick Emoji</p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {POPULAR_EMOJIS.map(em => (
                              <button key={em} type="button"
                                onClick={() => { setEmoji(em); setShowEmojiPicker(false); }}
                                className={`w-9 h-9 flex items-center justify-center text-lg rounded-lg transition-all hover:bg-primary/10 ${emoji === em ? 'bg-primary/15 ring-2 ring-primary/30' : ''}`}>
                                {em}
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 pt-2 border-t border-border">
                            <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="Or type any emoji…" maxLength={4}
                              className="text-center text-lg bg-background border-border text-foreground h-9" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex-1">
                    <ValidatedInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Appreciate Mutual Funds — ₹200"
                      className={inp} required touched={touched.name} onBlur={() => markTouched('name')} label="Offer Name" />
                  </div>
                </div>
              </div>

              <div>
                <label className={lbl}>Short Description *</label>
                <ValidatedInput value={desc} onChange={e => setDesc(e.target.value)} placeholder="One-line offer summary"
                  className={inp} required touched={touched.desc} onBlur={() => markTouched('desc')} label="Description" />
              </div>

              {/* ── 💰 PAYOUT ── */}
              <div className="p-4 rounded-xl border border-emerald-500/25 space-y-4" style={{ background: 'rgba(16,185,129,0.03)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-emerald-500 flex items-center gap-2">💰 Payout Split</p>
                  {payoutNum > 0 && (
                    <div className="flex gap-1.5">
                      {[{ label: '20/80', pct: 0.2 }, { label: '30/70', pct: 0.3 }, { label: '50/50', pct: 0.5 }].map(s => (
                        <button key={s.label} type="button" onClick={() => applySplit(s.pct)}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-primary bg-primary/5 border border-primary/20 rounded-full hover:bg-primary/10 transition-all">
                          <Zap size={9} /> {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Total Payout (₹) *</label>
                    <ValidatedInput type="number" value={payout} onChange={e => handleTotalPayoutChange(e.target.value)} placeholder="400"
                      className={inp} required touched={touched.payout} onBlur={() => markTouched('payout')} label="Payout" />
                  </div>
                  <div>
                    <label className={lbl}>🎁 User Payout (₹)</label>
                    <Input type="number" min={0} max={payoutNum} value={userPayout || ''} onChange={e => handleUserPayoutChange(Number(e.target.value) || 0)} className={inp} />
                    {payoutNum > 0 && <p className="text-[9px] text-emerald-500 mt-1 font-bold">{Math.round((userPayout / payoutNum) * 100)}% of total</p>}
                  </div>
                  <div>
                    <label className={lbl}>✂️ Admin Payout (₹)</label>
                    <div className="px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm font-black text-foreground">₹{adminPayout}</div>
                    {payoutNum > 0 && <p className="text-[9px] text-violet-500 mt-1 font-bold">{Math.round((adminPayout / payoutNum) * 100)}% of total</p>}
                  </div>
                </div>
                {payoutNum > 0 && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${payoutValid ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-destructive/5 border-destructive/20 text-destructive'}`}>
                    {payoutValid ? '✅' : '⚠️'} ₹{adminPayout} + ₹{userPayout} = ₹{adminPayout + userPayout}
                    {payoutValid ? ' ✓ Matches' : ` ≠ ₹${payoutNum}`}
                  </div>
                )}
              </div>

              {/* Payout Display Text */}
              <div>
                <label className={lbl}>Payout Display Text (Optional)</label>
                <Input value={payoutDisplay} onChange={e => setPayoutDisplay(e.target.value)} placeholder="e.g. Flat ₹500, Upto ₹500" className={inp} />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[`Flat ₹${payout || 'X'}`, `Upto ₹${payout || 'X'}`, `₹${Math.round(Number(payout || 0) * 0.5)}-₹${payout || 'X'}`, `₹${payout || 'X'} Cashback`].map(preset => (
                    <button key={preset} type="button" onClick={() => setPayoutDisplay(preset)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-all">{preset}</button>
                  ))}
                  {payoutDisplay && (
                    <button type="button" onClick={() => setPayoutDisplay('')}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-dashed border-destructive/40 text-destructive hover:bg-destructive/5 transition-all">✕ Clear</button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Override the default &quot;₹{payout || 'X'}&quot; display on cards. Leave blank for default.</p>
              </div>

              {/* Category + Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Category *</label>
                  <select value={category} onChange={e => { setCategory(e.target.value); if (e.target.value !== 'Custom') setCustomCategory(''); }}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm bg-background border-border text-foreground focus:outline-none focus:border-primary">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {category === 'Custom' && (
                    <div className="mt-2">
                      <Input value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="e.g. Insurance, Mutual Fund…" className={inp} />
                      <p className="text-[10px] text-muted-foreground mt-1">Custom category name — appears as filter on homepage.</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className={lbl}>Tags (comma separated)</label>
                  <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="New User, High Payout" className={inp} />
                </div>
              </div>

              {/* Partner Link + Test Button */}
              <div>
                <label className={lbl}>Partner Redirect Link *</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ValidatedInput value={link} onChange={e => setLink(e.target.value)} placeholder="https://partner-link.com/…"
                      className={inp} required touched={touched.link} onBlur={() => markTouched('link')} label="Partner Link" />
                  </div>
                  {link && /^https?:\/\/.+/i.test(link.trim()) && (
                    <button type="button" onClick={() => window.open(link.trim(), '_blank')}
                      className="flex items-center gap-1.5 px-3 h-10 text-xs font-bold text-primary bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-all flex-shrink-0">
                      <ExternalLink size={12} /> Test
                    </button>
                  )}
                </div>
              </div>

              {/* Status Picker */}
              <div>
                <label className={lbl}>Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setStatus('Active')}
                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${status === 'Active'
                      ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : 'border-border bg-background hover:border-emerald-500/30'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      <Check size={16} strokeWidth={3} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-black ${status === 'Active' ? 'text-emerald-500' : 'text-muted-foreground'}`}>Active</p>
                      <p className="text-[10px] text-muted-foreground">Visible & accepting leads</p>
                    </div>
                    {status === 'Active' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                  </button>
                  <button type="button" onClick={() => setStatus('Inactive')}
                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${status === 'Inactive'
                      ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'border-border bg-background hover:border-amber-500/30'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${status === 'Inactive' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                      <Pause size={16} strokeWidth={3} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-black ${status === 'Inactive' ? 'text-amber-500' : 'text-muted-foreground'}`}>Inactive</p>
                      <p className="text-[10px] text-muted-foreground">Hidden from users</p>
                    </div>
                    {status === 'Inactive' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={lbl}>Sort Rank (Higher = Shown First)</label>
                <Input type="number" min={0} value={rank} onChange={e => setRank(Number(e.target.value))} placeholder="0 = default" className={inp} />
                <p className="text-[10px] text-muted-foreground mt-1">Higher number pushes this offer to the top.</p>
              </div>
            </div>
          </div>

          {/* ═══ CAMPAIGN VISIBILITY ═══ */}
          <div className={`border rounded-2xl p-5 space-y-4 transition-all ${isPrivate ? 'bg-purple-500/5 border-purple-500/30' : 'bg-card border-border'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-syne font-black text-sm text-foreground flex items-center gap-2">{isPrivate ? '🔒' : '🌐'} Campaign Visibility</p>
                <p className="text-xs text-muted-foreground mt-0.5">{isPrivate ? 'Hidden — only accessible via exclusive direct link' : 'Visible on public homepage'}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black ${!isPrivate ? 'text-emerald-500' : 'text-muted-foreground/40'}`}>General</span>
                <button type="button" onClick={() => setIsPrivate(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${isPrivate ? 'bg-purple-500' : 'bg-border'}`}>
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
                <span className={`text-xs font-black ${isPrivate ? 'text-purple-400' : 'text-muted-foreground/40'}`}>Private</span>
              </div>
            </div>
            {isPrivate && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                  <p className="text-xs text-muted-foreground"><strong className="text-purple-400">🔒 Private:</strong> Hidden from homepage. Access only via direct link.</p>
                </div>
                <div>
                  <label className={lbl}>Custom Slug *</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono bg-background border border-border rounded-lg px-2.5 py-2 flex-shrink-0">/exclusive/</span>
                    <input value={privateSlug} onChange={e => { setPrivateSlug(e.target.value.replace(/\s+/g, '_')); setSlugManuallyEdited(true); }}
                      placeholder="AngelOne_Special" className={`flex-1 px-3 py-2 rounded-lg border text-sm font-mono ${inp}`} maxLength={80} />
                  </div>
                  {privateSlug && (
                    <div className="mt-2 flex items-center gap-2 p-2.5 bg-background border border-purple-500/20 rounded-xl">
                      <span className="text-purple-400 text-xs">🔗</span>
                      <p className="text-xs font-mono text-muted-foreground truncate flex-1">{appOrigin()}/exclusive/<strong className="text-purple-400">{privateSlug}</strong></p>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(`${appOrigin()}/exclusive/${privateSlug}`); toast.success('Link copied!'); }}
                        className="text-[10px] font-black text-purple-400 hover:underline flex-shrink-0">Copy</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* ═══ BRANDING ═══ */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <SectionHeader icon="🎨" title="Offer Branding" sub="Logo and banner images" />
            <div className="space-y-4">
              <ImageUploadField label="Offer Logo" value={logoUrl} onChange={setLogoUrl} hint="Square logo on offer card (replaces emoji)" aspectHint="1:1 square" />
              <ImageUploadField label="Offer Banner" value={bannerUrl} onChange={setBannerUrl} hint="Wide banner at top of offer page" aspectHint="16:5 wide" />
            </div>
          </div>

          {/* ═══ WARNING POPUP ═══ */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <SectionHeader icon="⚠️" title="Warning Popup" sub="Shown BEFORE offer details — user must acknowledge" />
            <Toggle value={warningPopupActive} onChange={setWarningPopupActive}
              label="Enable Warning Popup" sub={warningPopupActive ? '🟢 Active — popup shown before offer opens' : 'Off — no intercept popup'} />
            <AnimatePresence>
              {warningPopupActive && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                  {settings?.wifiWarningBannerUrl ? (
                    <>
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <p className="text-xs font-bold text-emerald-500 mb-2">✅ Using Global WiFi Banner</p>
                        <img src={settings.wifiWarningBannerUrl} alt="Global WiFi Banner" className="w-full max-h-32 object-cover rounded-lg border border-border" />
                      </div>
                      <div className="p-3 bg-background border border-border rounded-xl">
                        <p className="text-xs font-bold text-muted-foreground mb-2">📤 Upload Custom Override (Optional)</p>
                        <ImageUploadField label="Custom Banner" value={warningPopupImage} onChange={setWarningPopupImage} hint="Overrides global banner for this offer" aspectHint="4:3 or 1:1" />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                        <p className="text-xs font-bold text-amber-500">⚠️ No global WiFi banner set. Upload a custom banner below, or set one in Settings → Marketing.</p>
                      </div>
                      <ImageUploadField label="Warning Banner" value={warningPopupImage} onChange={setWarningPopupImage} hint="Custom warning popup banner" aspectHint="4:3 or 1:1" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ LEAD COLLECTION ═══ */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <p className="font-syne font-black text-sm text-foreground flex items-center gap-2">📋 Lead Collection</p>
              <p className="text-xs text-muted-foreground mt-0.5">Users fill this form before accessing the affiliate link</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="p-4 rounded-xl border border-primary/25 space-y-3" style={{ background: 'rgba(59,130,246,0.04)' }}>
                <p className="text-xs font-black text-primary flex items-center gap-2">🔘 User Payout Visibility</p>
                <Toggle value={showPayoutToUser} onChange={setShowPayoutToUser}
                  label="Display Payout to User" sub={showPayoutToUser ? '🟢 User sees cashback amount on tracker' : '🔴 Payout hidden from user (recommended)'} />
                <div className={`px-3 py-2 rounded-lg border ${showPayoutToUser ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <p className={`text-[10px] font-bold ${showPayoutToUser ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {showPayoutToUser ? '✅ Only User Got & Estimate shown. Admin Cut is NEVER exposed.' : '🔒 Payout amounts hidden — users see only offer name and status.'}
                  </p>
                </div>
              </div>
              <div className="bg-background border border-border rounded-xl overflow-hidden">
                <button type="button" onClick={() => setShowLeadFields(!showLeadFields)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-all">
                  <div className="flex items-center gap-3 text-left">
                    <span className="text-base">⚙️</span>
                    <div>
                      <p className="font-syne font-black text-foreground text-sm">Configure Form Fields</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{offerLeadFields.filter(f => f.enabled).length} active field{offerLeadFields.filter(f => f.enabled).length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 flex-shrink-0 ${showLeadFields ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showLeadFields && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 pt-1 border-t border-border">
                        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl mb-4">
                          <p className="text-xs text-muted-foreground"><span className="text-primary font-black">💡</span> Per-offer field overrides. Toggle, reorder, or add custom fields.</p>
                        </div>
                        <LeadFieldsConfig fields={offerLeadFields} onChange={setOfferLeadFields} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ═══ TIMER & SLOTS ═══ */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <SectionHeader icon="⏱️" title="Timer & Slots" sub="Urgency triggers" />
            <div>
              <label className={lbl}>Offer Expires At (leave blank = no timer)</label>
              <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${inp}`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Total Slots (0 = unlimited)</label>
                <input type="number" min={0} value={totalSlots} onChange={e => setTotalSlots(Number(e.target.value))} className={`px-3 py-2.5 rounded-xl border text-sm w-full ${inp}`} />
              </div>
              <div>
                <label className={lbl}>Filled Slots</label>
                <input type="number" min={0} value={filledSlots} onChange={e => setFilledSlots(Number(e.target.value))} className={`px-3 py-2.5 rounded-xl border text-sm w-full ${inp}`} />
              </div>
            </div>
            {totalSlots > 0 && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs font-bold text-primary">🔥 Preview: {Math.max(0, totalSlots - filledSlots)}/{totalSlots} slots left ({Math.round((filledSlots / totalSlots) * 100)}% filled)</p>
              </div>
            )}
          </div>

          {/* ═══ STEPS ═══ */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <SectionHeader icon="📝" title="How To Avail (Steps)" sub="Add numbered steps with optional reference photos" />
            <ListBuilder items={stepItems} onChange={setStepItems} addLabel="Add Step" placeholder="Step" />
            <Toggle value={stepsExpanded} onChange={setStepsExpanded}
              label="Steps Default View" sub={stepsExpanded ? '📖 Expanded — shown open by default' : '🔽 Collapsed — user taps to expand'} />
          </div>

          {/* ═══ TERMS ═══ */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <SectionHeader icon="📜" title="Terms & Conditions" sub="Add terms with optional reference images" />
            <ListBuilder items={termItems} onChange={setTermItems} addLabel="Add Term" placeholder="Term" />
            {termItems.length > 0 && <p className="text-xs text-emerald-500 font-bold">✓ Custom T&C will be shown for this offer</p>}
            <Toggle value={termsExpanded} onChange={setTermsExpanded}
              label="T&C Default View" sub={termsExpanded ? '📖 Expanded — shown open by default' : '🔽 Collapsed — user taps to expand'} />
          </div>

          {/* ═══ REFERRAL ═══ */}
          <div className={`border rounded-2xl overflow-hidden transition-all ${referralEnabled ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'}`}>
            <button type="button" onClick={() => setShowReferralSection(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/10 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-base">🔗</span>
                <div className="text-left">
                  <p className="font-syne font-black text-sm text-foreground">Referral Program</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{referralEnabled ? `✅ Enabled — ${referrerFormFields.length} field${referrerFormFields.length !== 1 ? 's' : ''}` : 'Disabled'}</p>
                </div>
              </div>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 flex-shrink-0 ${showReferralSection ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showReferralSection && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-6 pb-6 pt-2 border-t border-border/50 space-y-5">
                    <Toggle value={referralEnabled} onChange={setReferralEnabled}
                      label="Enable Referral Program" sub={referralEnabled ? '🟢 Users can generate referral links' : '🔴 Off'} />
                    <AnimatePresence>
                      {referralEnabled && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
                          <div className="bg-background border border-border rounded-xl p-4">
                            <p className="font-syne font-black text-xs text-foreground mb-3 flex items-center gap-2">📝 Referrer Form Fields</p>
                            <ReferrerFormBuilder fields={referrerFormFields} onChange={setReferrerFormFields} />
                          </div>
                          <div className="p-4 rounded-xl border border-amber-500/25 space-y-4" style={{ background: 'rgba(240,180,41,0.04)' }}>
                            <p className="text-xs font-black text-amber-500 flex items-center gap-2">💰 Referral Payout Split (3-Way)</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div><label className={lbl}>✂️ Admin (₹)</label><Input type="number" min={0} value={referralAdminCut || ''} onChange={e => setReferralAdminCut(Number(e.target.value) || 0)} className={inp} /></div>
                              <div><label className={lbl}>👤 Referrer (₹)</label><Input type="number" min={0} value={referralReferrerCut || ''} onChange={e => setReferralReferrerCut(Number(e.target.value) || 0)} className={inp} /></div>
                              <div><label className={lbl}>🎁 User (₹)</label><Input type="number" min={0} value={referralUserEstimate || ''} onChange={e => setReferralUserEstimate(Number(e.target.value) || 0)} className={inp} /></div>
                            </div>
                            {(() => {
                              const total = referralAdminCut + referralReferrerCut + referralUserEstimate;
                              const isValid = payoutNum > 0 && Math.abs(total - payoutNum) < 1;
                              return total > 0 ? (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${isValid ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-destructive/5 border-destructive/20 text-destructive'}`}>
                                  {isValid ? '✅' : '⚠️'} ₹{referralAdminCut} + ₹{referralReferrerCut} + ₹{referralUserEstimate} = ₹{total}
                                  {isValid ? ' ✓ Matches' : ` ≠ ₹${payoutNum}`}
                                </div>
                              ) : null;
                            })()}
                            <button type="button" onClick={() => {
                              if (payoutNum <= 0) return;
                              const ac = Math.round(payoutNum * 0.2); const rc = Math.round((payoutNum - ac) / 2);
                              setReferralAdminCut(ac); setReferralReferrerCut(rc); setReferralUserEstimate(payoutNum - ac - rc);
                            }} className="text-xs font-black text-primary hover:underline">⚡ Auto-Split (20/40/40)</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* ═══ STICKY SAVE BAR ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 backdrop-blur-xl bg-background/80">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-4">
          {isDirty && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-amber-500 hidden sm:inline">Unsaved</span>
            </div>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3.5 font-syne font-black text-base text-black bg-gradient-to-r from-gold to-fire rounded-2xl transition-all hover:opacity-90 disabled:opacity-60 shadow-xl"
            style={{ boxShadow: '0 8px 32px rgba(240,180,41,0.35)' }}>
            {saving ? '💾 Saving...' : offer ? '💾 Update Offer' : '🚀 Create Offer'}
          </button>
        </div>
      </div>
    </div>
  );
}
