import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TargetAndTransition } from 'framer-motion';
import { toast } from 'sonner';
import { adminSaveSettings, getSettings } from 'zitejs/api';
import { Zap, Save, Eye, RotateCcw, ChevronDown, ChevronUp, Monitor, Smartphone, Layers, Plus, Trash2, GripVertical } from 'lucide-react';
import type { UIButtonConfig, UIButtonAnimation, UIButtonSize, UIButtonAlign, UIBrandConfig, UIHeroConfig, UITickerConfig, UIOfferGridConfig, UIActiveOffersConfig, TrustPill } from '@/types';
import { DEFAULT_UI_BUTTONS, DEFAULT_UI_BRAND, DEFAULT_UI_HERO, DEFAULT_UI_TICKER, DEFAULT_UI_OFFER_GRID, DEFAULT_UI_ACTIVE_OFFERS } from '@/types';
import ImageUploadField from './ImageUploadField';

interface Props { password: string }

const ANIMATIONS: { value: UIButtonAnimation; label: string; emoji: string }[] = [
  { value: 'none',   label: 'None',    emoji: '—' },
  { value: 'pulse',  label: 'Pulse',   emoji: '💫' },
  { value: 'bounce', label: 'Bounce',  emoji: '🎯' },
  { value: 'glow',   label: 'Glow',    emoji: '✨' },
  { value: 'shake',  label: 'Shake',   emoji: '📳' },
];

const SIZES: { value: UIButtonSize; label: string; previewClass: string }[] = [
  { value: 'sm', label: 'Small',       previewClass: 'px-3 py-1.5 text-xs' },
  { value: 'md', label: 'Medium',      previewClass: 'px-5 py-2.5 text-sm' },
  { value: 'lg', label: 'Large',       previewClass: 'px-7 py-3.5 text-base' },
  { value: 'xl', label: 'Extra Large', previewClass: 'px-10 py-5 text-lg' },
];

const ALIGNS: { value: UIButtonAlign; label: string; icon: string }[] = [
  { value: 'left',   label: 'Left',       icon: '⬅️' },
  { value: 'center', label: 'Center',     icon: '↔️' },
  { value: 'right',  label: 'Right',      icon: '➡️' },
  { value: 'full',   label: 'Full Width', icon: '↕️' },
];

const ANIMATION_VARIANTS: Record<UIButtonAnimation, TargetAndTransition> = {
  none:   {},
  pulse:  { scale: [1, 1.04, 1] },
  bounce: { y: [0, -6, 0] },
  glow:   { boxShadow: ['0 0 0px rgba(240,180,41,0)', '0 0 28px rgba(240,180,41,0.7)', '0 0 0px rgba(240,180,41,0)'] },
  shake:  { x: [0, -4, 4, -4, 4, 0] },
};

const inp = 'w-full px-3 py-2 bg-background border border-border text-foreground text-xs rounded-lg focus:outline-none focus:border-primary transition-colors font-satoshi';
const sectionHeaderCls = 'flex items-center gap-3 p-4 cursor-pointer select-none';
const sectionBadge = 'text-[9px] px-2 py-0.5 rounded-full font-black';

// ── Collapsible Section Shell ─────────────────────────────────────────────────
function Section({ title, icon, badge, badgeColor, children, defaultOpen = false }: {
  title: string; icon: string; badge?: string; badgeColor?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-all mb-3 ${open ? 'border-primary/30 shadow-lg' : 'border-border bg-card'}`}>
      <div className={sectionHeaderCls} onClick={() => setOpen(o => !o)}>
        <span className="text-xl">{icon}</span>
        <div className="flex-1">
          <p className="font-syne font-black text-sm text-foreground">{title}</p>
        </div>
        {badge && <span className={`${sectionBadge} ${badgeColor || 'bg-primary/10 text-primary border border-primary/20'}`}>{badge}</span>}
        <button className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="border-t border-border/50 p-5 space-y-4 bg-background/40">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-xs font-bold text-foreground">{label}</span>
      <button onClick={() => onChange(!checked)} type="button"
        className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${checked ? 'bg-green-500' : 'bg-border'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  );
}

// ── Live button preview ───────────────────────────────────────────────────────
function ButtonPreview({ btn, device = 'desktop' }: { btn: UIButtonConfig; device?: 'desktop' | 'mobile' }) {
  const size = SIZES.find(s => s.value === btn.size)?.previewClass || 'px-5 py-2.5 text-sm';
  const alignClass = btn.align === 'full' ? 'w-full' : btn.align === 'center' ? 'mx-auto block' : btn.align === 'right' ? 'ml-auto block' : 'block';
  const isAnimated = btn.animation !== 'none';
  return (
    <div className={`p-4 bg-background/60 rounded-xl border border-border ${device === 'mobile' ? 'max-w-[200px]' : 'w-full'}`}>
      <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider mb-2 flex items-center gap-1">
        {device === 'mobile' ? <Smartphone size={9} /> : <Monitor size={9} />}
        {device === 'mobile' ? 'Mobile' : 'Desktop'}
      </p>
      <motion.button
        className={`font-syne font-black rounded-xl ${size} ${alignClass}`}
        style={{
          backgroundColor: btn.bgColor, color: btn.textColor,
          borderColor: btn.borderColor === 'transparent' ? 'transparent' : btn.borderColor,
          borderWidth: btn.borderColor === 'transparent' ? 0 : 1, borderStyle: 'solid',
        }}
        animate={isAnimated ? ANIMATION_VARIANTS[btn.animation] : undefined}
        transition={isAnimated ? { repeat: Infinity, duration: btn.animation === 'shake' ? 0.5 : 2, ease: 'easeInOut' } : undefined}
      >{btn.text}</motion.button>
    </div>
  );
}

// ── Platform location badge ───────────────────────────────────────────────────
function LocationBadge({ id }: { id: string }) {
  const map: Record<string, { label: string; color: string }> = {
    'hero-cta':         { label: 'Homepage → Hero',   color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    'lead-track-cta':   { label: 'Homepage → Hero',   color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    'nav-earn-cta':     { label: 'Navbar (Desktop)',   color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    'offer-apply':      { label: 'Offer Cards',       color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    'cashback-form-cta':{ label: 'Cashback Section',   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  };
  const info = map[id];
  if (!info) return null;
  return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${info.color}`}>📍 {info.label}</span>;
}

// ── Individual Button Editor ──────────────────────────────────────────────────
function ButtonEditor({ btn, onChange }: { btn: UIButtonConfig; onChange: (b: UIButtonConfig) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${open ? 'border-primary/40 shadow-lg' : 'border-border bg-card hover:border-border/80'}`}>
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm flex-shrink-0 font-black border"
          style={{ backgroundColor: btn.bgColor + '22', borderColor: btn.bgColor + '55', color: btn.bgColor }}
          animate={btn.enabled && btn.animation !== 'none' ? ANIMATION_VARIANTS[btn.animation] : undefined}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
          {btn.text.slice(0, 2)}
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-syne font-black text-sm text-foreground">{btn.name}</p>
            <LocationBadge id={btn.id} />
          </div>
          <p className="text-xs text-muted-foreground truncate">"{btn.text}" · <span className="text-muted-foreground/60">{btn.size} · {btn.animation} · {btn.align}</span></p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => onChange({ ...btn, enabled: !btn.enabled })}
            className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${btn.enabled ? 'bg-green-500' : 'bg-border'}`}>
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${btn.enabled ? 'left-6' : 'left-1'}`} />
          </button>
          <button onClick={() => setOpen(o => !o)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="border-t border-border/50 p-5 space-y-5 bg-background/40">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><Eye size={10} /> Live Preview</p>
                <div className="flex gap-3 flex-wrap"><ButtonPreview btn={btn} device="desktop" /><ButtonPreview btn={btn} device="mobile" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Button Text & Emoji</label>
                  <input className={inp} value={btn.text} onChange={e => onChange({ ...btn, text: e.target.value })} placeholder="e.g. 🚀 Start Earning Now" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Redirect URL / Anchor</label>
                  <input className={inp} value={btn.href} onChange={e => onChange({ ...btn, href: e.target.value })} placeholder="#offers  or  /user-lead-track  or  https://…" />
                  <p className="text-[9px] text-muted-foreground/60 mt-1">#anchor scrolls · /path navigates · https:// opens new tab</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Background Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={btn.bgColor} onChange={e => onChange({ ...btn, bgColor: e.target.value })} className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent" />
                    <input className={inp} value={btn.bgColor} onChange={e => onChange({ ...btn, bgColor: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Text Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={btn.textColor} onChange={e => onChange({ ...btn, textColor: e.target.value })} className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent" />
                    <input className={inp} value={btn.textColor} onChange={e => onChange({ ...btn, textColor: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Border Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={btn.borderColor === 'transparent' ? '#ffffff' : btn.borderColor} onChange={e => onChange({ ...btn, borderColor: e.target.value })} className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent" />
                    <input className={inp} value={btn.borderColor} onChange={e => onChange({ ...btn, borderColor: e.target.value })} placeholder="transparent or #hex" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Hover Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={btn.hoverBgColor || btn.bgColor} onChange={e => onChange({ ...btn, hoverBgColor: e.target.value })} className="w-9 h-9 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent" />
                    <input className={inp} value={btn.hoverBgColor} onChange={e => onChange({ ...btn, hoverBgColor: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Size</label>
                  <div className="grid grid-cols-2 gap-1">
                    {SIZES.map(s => (
                      <button key={s.value} onClick={() => onChange({ ...btn, size: s.value })}
                        className={`py-2 rounded-lg border text-[10px] font-black transition-all ${btn.size === s.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Alignment</label>
                  <div className="grid grid-cols-2 gap-1">
                    {ALIGNS.map(a => (
                      <button key={a.value} onClick={() => onChange({ ...btn, align: a.value })}
                        className={`py-2 rounded-lg border text-[10px] font-black transition-all ${btn.align === a.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                        {a.icon} {a.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Animation</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ANIMATIONS.map(a => (
                      <button key={a.value} onClick={() => onChange({ ...btn, animation: a.value })}
                        className={`p-2.5 rounded-xl border text-center transition-all ${btn.animation === a.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                        <div className="text-base mb-0.5">{a.emoji}</div>
                        <div className="text-[9px] font-black">{a.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Platform Map ──────────────────────────────────────────────────────────────
function PlatformMap({ buttons }: { buttons: UIButtonConfig[] }) {
  const zones = [
    { label: 'Navbar', icon: '🧭', ids: ['nav-earn-cta'] },
    { label: 'Hero Section', icon: '🦸', ids: ['hero-cta', 'lead-track-cta'] },
    { label: 'Offer Cards', icon: '🎁', ids: ['offer-apply'] },
    { label: 'Cashback Section', icon: '💰', ids: ['cashback-form-cta'] },
  ];
  return (
    <div className="mb-4 p-4 bg-card border border-border rounded-2xl">
      <p className="text-xs font-black text-foreground mb-3 flex items-center gap-1.5"><Layers size={13} /> Platform Button Map</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {zones.map(zone => {
          const zoneBtns = zone.ids.map(id => buttons.find(b => b.id === id)).filter(Boolean) as UIButtonConfig[];
          const allEnabled = zoneBtns.every(b => b.enabled);
          const anyEnabled = zoneBtns.some(b => b.enabled);
          return (
            <div key={zone.label} className={`rounded-xl border p-3 ${allEnabled ? 'border-green-500/25 bg-green-500/5' : anyEnabled ? 'border-amber-500/25 bg-amber-500/5' : 'border-border bg-card/40 opacity-60'}`}>
              <p className="text-sm mb-1">{zone.icon}</p>
              <p className="text-[10px] font-black text-foreground">{zone.label}</p>
              <p className={`text-[9px] font-bold mt-0.5 ${allEnabled ? 'text-green-400' : anyEnabled ? 'text-amber-400' : 'text-muted-foreground'}`}>
                {allEnabled ? '● Active' : anyEnabled ? '◐ Partial' : '○ Hidden'}
              </p>
              {zoneBtns.map(b => <p key={b.id} className="text-[9px] text-muted-foreground/70 truncate mt-0.5">"{b.text}"</p>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Trust Pill Editor ─────────────────────────────────────────────────────────
function TrustPillsEditor({ pills, onChange }: { pills: TrustPill[]; onChange: (p: TrustPill[]) => void }) {
  return (
    <div>
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 block">Trust Pills</label>
      <div className="space-y-2">
        {pills.map((pill, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical size={12} className="text-muted-foreground/40 flex-shrink-0" />
            <input className={`${inp} !w-16 text-center`} value={pill.icon} onChange={e => { const n = [...pills]; n[i] = { ...pill, icon: e.target.value }; onChange(n); }} placeholder="✅" />
            <input className={`${inp} flex-1`} value={pill.label} onChange={e => { const n = [...pills]; n[i] = { ...pill, label: e.target.value }; onChange(n); }} placeholder="Verified Payouts" />
            <button onClick={() => onChange(pills.filter((_, j) => j !== i))}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={() => onChange([...pills, { icon: '🎯', label: 'New Pill' }])}
        className="mt-2 flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
        <Plus size={12} /> Add Trust Pill
      </button>
    </div>
  );
}

// ── Categories Editor ─────────────────────────────────────────────────────────
function CategoriesEditor({ categories, onChange }: { categories: string[]; onChange: (c: string[]) => void }) {
  return (
    <div>
      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 block">Custom Offer Categories</label>
      <div className="space-y-2">
        {categories.map((cat, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={`${inp} flex-1`} value={cat} onChange={e => { const n = [...categories]; n[i] = e.target.value; onChange(n); }} placeholder="e.g. Demat, Banking" />
            <button onClick={() => onChange(categories.filter((_, j) => j !== i))}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={() => onChange([...categories, ''])}
        className="mt-2 flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
        <Plus size={12} /> Add Category
      </button>
      <p className="text-[9px] text-muted-foreground/60 mt-1">Leave empty to auto-detect from offers.</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ██  MAIN GOD-MODE UI BUILDER  ██
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminUIBuilder({ password }: Props) {
  const [buttons, setButtons] = useState<UIButtonConfig[]>(DEFAULT_UI_BUTTONS);
  const [brand, setBrand] = useState<UIBrandConfig>(DEFAULT_UI_BRAND);
  const [hero, setHero] = useState<UIHeroConfig>(DEFAULT_UI_HERO);
  const [ticker, setTicker] = useState<UITickerConfig>(DEFAULT_UI_TICKER);
  const [offerGrid, setOfferGrid] = useState<UIOfferGridConfig>(DEFAULT_UI_OFFER_GRID);
  const [activeOffers, setActiveOffers] = useState<UIActiveOffersConfig>(DEFAULT_UI_ACTIVE_OFFERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSettings({}).then(s => {
      try {
        const parsed = JSON.parse((s as { uiConfigJson?: string }).uiConfigJson || '{}');
        if (parsed.buttons?.length) {
          const saved: UIButtonConfig[] = parsed.buttons;
          const merged = DEFAULT_UI_BUTTONS.map(def => saved.find(b => b.id === def.id) ?? def);
          const extra = saved.filter(b => !DEFAULT_UI_BUTTONS.find(d => d.id === b.id));
          setButtons([...merged, ...extra]);
        }
        if (parsed.brand) setBrand({ ...DEFAULT_UI_BRAND, ...parsed.brand });
        else setBrand({ siteName: s.siteName || '', webLogoUrl: s.webLogoUrl || '', faviconUrl: s.faviconUrl || '' });
        if (parsed.hero) setHero({ ...DEFAULT_UI_HERO, ...parsed.hero, trustPills: parsed.hero.trustPills?.length ? parsed.hero.trustPills : DEFAULT_UI_HERO.trustPills });
        if (parsed.ticker) setTicker({ ...DEFAULT_UI_TICKER, ...parsed.ticker });
        else {
          // Migrate from legacy settings
          const layoutCfg = (() => { try { return JSON.parse(s.layoutConfig || '{}'); } catch { return {}; } })();
          setTicker({ show: layoutCfg.showTicker !== false, label: '', customText: s.tickerText || '' });
        }
        if (parsed.offerGrid) setOfferGrid({ ...DEFAULT_UI_OFFER_GRID, ...parsed.offerGrid });
        if (parsed.activeOffers) setActiveOffers({ ...DEFAULT_UI_ACTIVE_OFFERS, ...parsed.activeOffers });
        else {
          const layoutCfg = (() => { try { return JSON.parse(s.layoutConfig || '{}'); } catch { return {}; } })();
          setOfferGrid({ columns: layoutCfg.offerColumns || '3', categories: layoutCfg.offerCategories || [] });
        }
      } catch { /* use defaults */ }
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (saving) return; // Prevent double-save
    setSaving(true);
    try {
      await adminSaveSettings({
        password,
        uiConfigJson: JSON.stringify({ buttons, brand, hero, ticker, offerGrid, activeOffers }),
        // Also sync brand fields as top-level settings for backward compatibility
        siteName: brand.siteName,
        webLogoUrl: brand.webLogoUrl,
        faviconUrl: brand.faviconUrl,
        tickerText: ticker.customText,
      });
      toast.success('✨ God-Mode saved! All changes are live.');
    } catch {
      toast.error('Save failed. Try again.', { action: { label: 'Retry', onClick: handleSave } });
    } finally {
      // Small delay to prevent rapid double-clicks from re-triggering
      setTimeout(() => setSaving(false), 400);
    }
  }

  const [resetConfirm, setResetConfirm] = useState(false);
  function resetAll() {
    if (!resetConfirm) {
      setResetConfirm(true);
      toast.info('Click Reset again to confirm — this resets all UI settings to defaults.', { duration: 4000 });
      setTimeout(() => setResetConfirm(false), 4000);
      return;
    }
    setResetConfirm(false);
    setButtons(DEFAULT_UI_BUTTONS);
    setBrand(DEFAULT_UI_BRAND);
    setHero(DEFAULT_UI_HERO);
    setTicker(DEFAULT_UI_TICKER);
    setOfferGrid(DEFAULT_UI_OFFER_GRID);
    setActiveOffers(DEFAULT_UI_ACTIVE_OFFERS);
    toast.info('Reset to factory defaults — click Save to apply.');
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="font-syne font-black text-2xl text-foreground flex items-center gap-2">
            <Zap size={22} className="text-primary" /> God-Mode UI Builder
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Your single control center — brand, hero, ticker, offers, and every CTA button across the site.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetAll}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${resetConfirm ? 'border-destructive/60 bg-destructive/10 text-destructive' : 'border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive'}`}>
            <RotateCcw size={14} /> {resetConfirm ? 'Confirm Reset?' : 'Reset All'}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-syne font-black text-sm text-black transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#f0b429,#ff5722)' }}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-start gap-3">
        <span className="text-xl flex-shrink-0">🎮</span>
        <div>
          <p className="font-syne font-black text-sm text-foreground mb-1">How God-Mode Works</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Everything on the user-facing site is controlled from here — branding, hero section, announcements, offer grid layout, and every CTA button. Make changes, hit <strong>Save All Changes</strong>, and they go live instantly.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-card border border-border rounded-2xl animate-pulse" />)}</div>
      ) : (
        <>
          {/* ── 1. BRAND & LOGO ────────────────────────────────────────────── */}
          <Section title="Brand & Logo" icon="🎨" badge="Identity" badgeColor="bg-violet-500/10 text-violet-400 border border-violet-500/20" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Site Name</label>
                <input className={inp} value={brand.siteName} onChange={e => setBrand(p => ({ ...p, siteName: e.target.value }))} placeholder="e.g. EarningHub" />
                <p className="text-[9px] text-muted-foreground/60 mt-1">Shows in the navbar, browser tab, and SEO fallback title.</p>
              </div>
              <ImageUploadField label="Web Logo" value={brand.webLogoUrl} onChange={url => setBrand(p => ({ ...p, webLogoUrl: url }))} hint="Recommended: transparent PNG, 400×80px" />
              <ImageUploadField label="Favicon" value={brand.faviconUrl} onChange={url => setBrand(p => ({ ...p, faviconUrl: url }))} hint="32×32px PNG or ICO" aspectHint="1:1" />
            </div>
            {/* Live preview */}
            {(brand.webLogoUrl || brand.siteName) && (
              <div className="mt-4 p-4 bg-background/60 border border-border rounded-xl">
                <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider mb-2">📍 Navbar Preview</p>
                <div className="flex items-center gap-3">
                  {brand.webLogoUrl ? (
                    <img src={brand.webLogoUrl} alt="" className="h-10 w-auto max-w-[180px] object-contain" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-primary/20">💰</div>
                      <span className="font-syne font-black text-lg">{brand.siteName || 'EarningHub'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* ── 2. HERO SECTION ────────────────────────────────────────────── */}
          <Section title="Hero Section" icon="🦸" badge={hero.show ? 'Visible' : 'Hidden'} badgeColor={hero.show ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}>
            <Toggle checked={hero.show} onChange={v => setHero(p => ({ ...p, show: v }))} label="Show Hero Section" />
            {hero.show && (
              <div className="space-y-4 mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Headline Line 1</label>
                    <input className={inp} value={hero.headlineLine1} onChange={e => setHero(p => ({ ...p, headlineLine1: e.target.value }))} placeholder="India's #1 Platform" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Headline Line 2</label>
                    <input className={inp} value={hero.headlineLine2} onChange={e => setHero(p => ({ ...p, headlineLine2: e.target.value }))} placeholder="to Earn Online" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Sub-headline (Desktop)</label>
                  <textarea className={`${inp} !h-16 resize-none`} value={hero.subHeadline} onChange={e => setHero(p => ({ ...p, subHeadline: e.target.value }))} placeholder="Longer description for desktop screens…" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Sub-headline (Mobile)</label>
                  <input className={inp} value={hero.subHeadlineMobile} onChange={e => setHero(p => ({ ...p, subHeadlineMobile: e.target.value }))} placeholder="Shorter version for mobile" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Live Badge Text</label>
                  <input className={inp} value={hero.badgeText} onChange={e => setHero(p => ({ ...p, badgeText: e.target.value }))} placeholder="10,000+ Active Earners Right Now" />
                  <p className="text-[9px] text-muted-foreground/60 mt-1">The green-dot animated badge at the top of the hero.</p>
                </div>
                <TrustPillsEditor pills={hero.trustPills} onChange={pills => setHero(p => ({ ...p, trustPills: pills }))} />

                {/* Hero mini preview */}
                <div className="p-4 bg-background/60 border border-border rounded-xl">
                  <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider mb-3">📍 Hero Preview</p>
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> {hero.badgeText}
                    </div>
                    <p className="font-syne font-black text-xl text-foreground">{hero.headlineLine1}</p>
                    <p className="font-syne font-black text-xl text-primary">{hero.headlineLine2}</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">{hero.subHeadline}</p>
                    <div className="flex justify-center gap-2 flex-wrap">
                      {hero.trustPills.map((p, i) => (
                        <span key={i} className="text-[9px] px-2 py-1 rounded-full bg-card border border-border">{p.icon} {p.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* ── 3. ANNOUNCEMENT TICKER ─────────────────────────────────────── */}
          <Section title="Announcement Ticker" icon="📢" badge={ticker.show ? 'Live' : 'Off'} badgeColor={ticker.show ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}>
            <Toggle checked={ticker.show} onChange={v => setTicker(p => ({ ...p, show: v }))} label="Show Ticker Bar" />
            {ticker.show && (
              <div className="space-y-4 mt-3">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Ticker Label</label>
                  <input className={inp} value={ticker.label} onChange={e => setTicker(p => ({ ...p, label: e.target.value }))} placeholder="Live Payouts (default)" />
                  <p className="text-[9px] text-muted-foreground/60 mt-1">The bold label on the left side — leave empty for default ("Live Payouts" or "Announcements").</p>
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Custom Ticker Text</label>
                  <textarea className={`${inp} !h-16 resize-none`} value={ticker.customText} onChange={e => setTicker(p => ({ ...p, customText: e.target.value }))}
                    placeholder="Custom announcement text… (separate with | for multiple segments)" />
                  <p className="text-[9px] text-muted-foreground/60 mt-1">Leave empty to auto-generate from live offers. Use <strong>|</strong> to separate multiple announcements.</p>
                </div>
              </div>
            )}
          </Section>

          {/* ── 4. OFFER GRID ──────────────────────────────────────────────── */}
          <Section title="Offer Grid Layout" icon="🎯" badge={`${offerGrid.columns} cols`}>
            <div>
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2 block">Grid Columns (Desktop)</label>
              <div className="grid grid-cols-3 gap-2">
                {(['2', '3', '4'] as const).map(c => (
                  <button key={c} onClick={() => setOfferGrid(p => ({ ...p, columns: c }))}
                    className={`py-3 rounded-xl border text-sm font-black transition-all ${offerGrid.columns === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                    {c} Columns
                  </button>
                ))}
              </div>
            </div>
            <CategoriesEditor categories={offerGrid.categories} onChange={cats => setOfferGrid(p => ({ ...p, categories: cats }))} />
          </Section>

          {/* ── 5. ACTIVE CASHBACK OFFERS ──────────────────────────────────── */}
          <Section title="Active Cashback Offers" icon="💰" badge={activeOffers.show ? 'Visible' : 'Hidden'} badgeColor={activeOffers.show ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}>
            <Toggle checked={activeOffers.show} onChange={v => setActiveOffers(p => ({ ...p, show: v }))} label="Show Active Cashback Offers Section" />
            {activeOffers.show && (
              <div className="space-y-4 mt-3">
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Section Heading</label>
                  <input className={inp} value={activeOffers.heading} onChange={e => setActiveOffers(p => ({ ...p, heading: e.target.value }))} placeholder="Active Cashback Offers" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Subtitle / Description</label>
                  <textarea className={`${inp} !h-16 resize-none`} value={activeOffers.subtitle} onChange={e => setActiveOffers(p => ({ ...p, subtitle: e.target.value }))}
                    placeholder="Pick an offer → complete the task → get cashback directly to your UPI" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Status Badge — Left</label>
                    <input className={inp} value={activeOffers.badgeLiveNow} onChange={e => setActiveOffers(p => ({ ...p, badgeLiveNow: e.target.value }))} placeholder="Live Now" />
                    <p className="text-[9px] text-muted-foreground/60 mt-1">The pill badge (e.g. "LIVE NOW").</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Status Badge — Right</label>
                    <input className={inp} value={activeOffers.badgeActive} onChange={e => setActiveOffers(p => ({ ...p, badgeActive: e.target.value }))} placeholder="Active" />
                    <p className="text-[9px] text-muted-foreground/60 mt-1">The green-dot animated label (e.g. "ACTIVE").</p>
                  </div>
                </div>

                {/* Mini preview */}
                <div className="p-4 bg-background/60 border border-border rounded-xl">
                  <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-wider mb-3">📍 Section Preview</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">{activeOffers.badgeLiveNow || 'Live Now'}</span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[9px] font-bold text-green-400 uppercase">{activeOffers.badgeActive || 'Active'}</span>
                      </span>
                    </div>
                    <p className="font-syne font-black text-base text-foreground">{activeOffers.heading || 'Active Cashback Offers'}</p>
                    <p className="text-xs text-muted-foreground">{activeOffers.subtitle || 'Pick an offer → complete the task → get cashback directly to your UPI'}</p>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* ── 6. CTA BUTTONS ─────────────────────────────────────────────── */}
          <Section title="Homepage CTA Buttons" icon="🔘" badge={`${buttons.filter(b => b.enabled).length}/${buttons.length} active`}>
            <PlatformMap buttons={buttons} />
            <div className="space-y-3">
              {buttons.map((btn, idx) => (
                <ButtonEditor key={btn.id} btn={btn} onChange={updated => setButtons(prev => prev.map((b, i) => i === idx ? updated : b))} />
              ))}
            </div>
          </Section>
        </>
      )}

      {/* Sticky save footer */}
      <div className="mt-8 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl font-syne font-black text-base text-black disabled:opacity-60 disabled:cursor-not-allowed shadow-xl active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg,#f0b429,#ff5722)', boxShadow: '0 8px 32px rgba(240,180,41,0.35)' }}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save All UI Changes'}
        </button>
      </div>
    </div>
  );
}
