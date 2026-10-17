import { appOrigin } from '@/lib/appUrl';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Share2, Check, MessageCircle, BarChart2, Link2, Gift, ArrowUpRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { generateReferralLink } from '@/lib/api';
import type { Offer, ReferrerFormField } from '@/types';
import { useAppContext } from '@/contexts/AppContext';

interface Props { offer: Offer; onClose: () => void; }

function validateField(field: ReferrerFormField, value: string): string | null {
  if (field.required && !value.trim()) return `${field.label} is required`;
  if (value && field.validationRegex) {
    try { if (!new RegExp(field.validationRegex).test(value)) return field.validationMessage || `Invalid ${field.label}`; } catch {}
  }
  return null;
}

type SplitMode = 'customize' | 'keep_all' | 'no_sharing';

export default function ReferralLinkModal({ offer, onClose }: Props) {
  const { settings } = useAppContext();
  const siteName = settings?.siteName || 'EarningHub';

  const fields: ReferrerFormField[] = (() => {
    try { const p = JSON.parse(offer.referrerFormConfig || '[]'); return Array.isArray(p) ? p : []; } catch { return []; }
  })();

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [splitMode, setSplitMode] = useState<SplitMode>('customize');
  const [referrerSplit, setReferrerSplit] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ code: string; link: string; trackerLink: string; isExisting: boolean } | null>(null);
  const [copied, setCopied] = useState<'link' | 'tracker' | null>(null);

  const totalPayout = offer.payout;
  const effectiveSplit = splitMode === 'keep_all' ? 100 : splitMode === 'no_sharing' ? 0 : referrerSplit;
  const youGet = Math.round((effectiveSplit / 100) * totalPayout);
  const friendGets = totalPayout - youGet;
  const slug = offer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Extract UPI from form values
  const upiField = fields.find(f => f.label.toLowerCase().includes('upi') || f.id.toLowerCase().includes('upi'));
  const referrerUpi = upiField ? (values[upiField.id] || '') : '';

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    fields.forEach(f => { const e = validateField(f, values[f.id] || ''); if (e) newErrors[f.id] = e; });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleGenerate() {
    if (!validate()) return;
    const firstTxtField = fields.find(f => f.type === 'text' || f.type === 'tel' || f.type === 'email');
    const referrerName = (firstTxtField ? values[firstTxtField.id] : '') || 'Referrer';
    const customReferrerData = JSON.stringify(fields.reduce((acc, f) => ({ ...acc, [f.label]: values[f.id] || '' }), {}));
    setGenerating(true);
    try {
      const res = await generateReferralLink({
        offerSlug: slug, offerName: offer.name, referrerName,
        customReferrerData, referrerSplit: String(effectiveSplit), referrerUpi,
      });
      // Build the .ref and .track style links (alongside the legacy /refer/ and /offereftrck/ links)
      const appUrl = appOrigin();
      const refLink = `${appUrl}/${slug}.ref/${res.code}`;
      const trackLink = `${appUrl}/${slug}.track/${res.code}`;
      setResult({ code: res.code, link: refLink, trackerLink: trackLink, isExisting: res.isExisting });
    } catch (e) {
      toast.error(String((e as { message?: string })?.message || 'Failed to generate link'));
    } finally { setGenerating(false); }
  }

  function copyText(text: string, type: 'link' | 'tracker') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      toast.success(type === 'link' ? 'Referral link copied! 🎉' : 'Tracker link copied! 📊');
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function shareWhatsApp() {
    if (!result) return;
    const msg = `🎁 Join ${siteName} and earn cashback!\n\n💰 You get ₹${friendGets} when you complete the offer!\n\n🔗 My exclusive link:\n${result.link}\n\n✨ Limited slots — act fast!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function shareTelegram() {
    if (!result) return;
    const msg = `🎁 Earn ₹${friendGets} cashback on ${offer.name}! Use my link: ${result.link}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(result.link)}&text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/80 via-blue-400/60 to-transparent" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                  {offer.logoUrl ? <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover" /> : <span className="text-xl">{offer.emoji || '🎯'}</span>}
                </div>
                <div>
                  <h3 className="font-syne font-black text-base text-foreground">{offer.name}</h3>
                  <div className="inline-flex items-center gap-1.5 mt-0.5 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <span className="text-[10px] font-black text-amber-400">EARN UP TO</span>
                    <span className="text-xs font-black text-amber-400">₹{totalPayout}</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"><X size={18} /></button>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-4 max-h-[78vh] overflow-y-auto">
            {!result ? (
              <>
                {/* Dynamic Form Fields */}
                {fields.length > 0 && (
                  <div className="space-y-3">
                    {fields.map(field => (
                      <div key={field.id}>
                        <label className="text-xs font-black text-foreground mb-1.5 flex items-center gap-1">
                          {field.label}
                          {field.required && <span className="text-destructive">*</span>}
                          {!field.required && <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>}
                        </label>
                        {field.type === 'dropdown' ? (
                          <select value={values[field.id] || ''} onChange={e => { setValues(v => ({ ...v, [field.id]: e.target.value })); setErrors(er => ({ ...er, [field.id]: '' })); }}
                            className="w-full px-3.5 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors">
                            <option value="">Select {field.label}</option>
                            {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input type={field.type} value={values[field.id] || ''}
                            onChange={e => { setValues(v => ({ ...v, [field.id]: e.target.value })); setErrors(er => ({ ...er, [field.id]: '' })); }}
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            className={`w-full px-3.5 py-2.5 bg-background border text-foreground text-sm rounded-xl focus:outline-none transition-colors ${errors[field.id] ? 'border-destructive' : 'border-border focus:border-primary'}`} />
                        )}
                        {errors[field.id] && <p className="text-[11px] text-destructive mt-1">{errors[field.id]}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Payout Split Mode */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">💰 Commission Mode</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { mode: 'customize' as SplitMode, icon: '⚖️', label: 'Custom Split' },
                      { mode: 'keep_all' as SplitMode, icon: '💎', label: 'Keep All' },
                      { mode: 'no_sharing' as SplitMode, icon: '🎁', label: 'Gift All' },
                    ]).map(opt => (
                      <button key={opt.mode} onClick={() => setSplitMode(opt.mode)}
                        className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-center transition-all text-xs font-black ${splitMode === opt.mode ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/40'}`}>
                        <span className="text-base">{opt.icon}</span>
                        <span className="leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {splitMode === 'keep_all' && '💎 You keep 100% of payout — friends get the offer benefit only'}
                    {splitMode === 'no_sharing' && '🎁 Friend gets full payout — great for pure sharing!'}
                    {splitMode === 'customize' && '⚖️ Customize how to split earnings with your referrals'}
                  </p>
                </div>

                {/* Slider — only for customize mode */}
                {splitMode === 'customize' && (
                  <div className="bg-background border border-border rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">⚖️</span>
                      <div>
                        <p className="text-xs font-black text-foreground">Customize Commission</p>
                        <p className="text-[10px] text-muted-foreground">Split earnings with your referrals</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                      {offer.name?.toUpperCase().slice(0, 20)} &nbsp;·&nbsp; Total: ₹{totalPayout}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-xl">
                        <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-1">YOU GET</p>
                        <p className="font-syne font-black text-2xl text-primary">₹ {youGet}</p>
                      </div>
                      <div className="text-center p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">FRIEND GETS</p>
                        <p className="font-syne font-black text-2xl text-amber-400">₹ {friendGets}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <input type="range" min={0} max={100} step={5} value={referrerSplit}
                        onChange={e => setReferrerSplit(Number(e.target.value))} className="w-full accent-primary" />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>100% to friend</span>
                        <span>100% to you</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Non-slider payout display */}
                {splitMode !== 'customize' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-xl">
                      <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-1">YOU GET</p>
                      <p className="font-syne font-black text-2xl text-primary">₹ {youGet}</p>
                    </div>
                    <div className="text-center p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-1">FRIEND GETS</p>
                      <p className="font-syne font-black text-2xl text-amber-400">₹ {friendGets}</p>
                    </div>
                  </div>
                )}

                <button onClick={handleGenerate} disabled={generating}
                  className="w-full py-3.5 font-syne font-black text-sm text-black rounded-2xl transition-all hover:opacity-90 disabled:opacity-60 shadow-lg flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #f0b429 0%, #ff5722 100%)' }}>
                  <Link2 size={16} />
                  {generating ? '⏳ Generating...' : '🔗 Create Referral Link'}
                </button>

                <p className="text-center text-[10px] text-muted-foreground">
                  🔍 <button onClick={() => window.open(`${appOrigin()}/user-lead-track`, '_blank')} className="underline hover:text-foreground transition-colors">Track Your Referrals →</button>
                </p>
              </>
            ) : (
              /* ── Success / Existing Link State ── */
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                <div className="text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3 text-3xl">
                    {result.isExisting ? '🔄' : '🎉'}
                  </motion.div>
                  <h4 className="font-syne font-black text-lg text-foreground">
                    {result.isExisting ? 'Welcome Back!' : 'Your Link is Ready!'}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.isExisting
                      ? 'You already have a referral link for this offer — here it is!'
                      : `Share it with friends and earn ₹${youGet} per referral`}
                  </p>
                </div>

                {result.isExisting && (
                  <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <span className="text-amber-400 text-base">⚡</span>
                    <p className="text-xs text-amber-400 font-bold">1 UPI ID = 1 Referral Link per offer. Your existing link is shown below.</p>
                  </div>
                )}

                {/* Referral Link */}
                <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Link2 size={12} className="text-emerald-400 flex-shrink-0" />
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">✓ Your Referral Link</p>
                  </div>
                  <div className="bg-background border border-border rounded-xl px-3 py-2">
                    <p className="text-xs font-mono text-foreground break-all leading-relaxed">{result.link}</p>
                  </div>
                  <button onClick={() => copyText(result.link, 'link')}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${copied === 'link' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}>
                    {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
                    {copied === 'link' ? 'Copied!' : 'Copy Referral Link'}
                  </button>
                </div>

                {/* Tracker Link */}
                <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart2 size={12} className="text-primary flex-shrink-0" />
                    <p className="text-[10px] font-black text-primary uppercase tracking-wider">📊 Your Referral Tracker Link</p>
                  </div>
                  <div className="bg-background border border-border rounded-xl px-3 py-2">
                    <p className="text-xs font-mono text-foreground break-all leading-relaxed">{result.trackerLink}</p>
                  </div>
                  <button onClick={() => copyText(result.trackerLink, 'tracker')}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${copied === 'tracker' ? 'bg-primary/20 border border-primary/40 text-primary' : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'}`}>
                    {copied === 'tracker' ? <Check size={14} /> : <BarChart2 size={14} />}
                    {copied === 'tracker' ? 'Copied!' : 'Copy Tracker Link'}
                  </button>
                </div>

                {/* Share */}
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={shareWhatsApp}
                    className="flex flex-col items-center gap-1 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-[10px] font-black hover:bg-green-500/20 transition-all">
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button onClick={shareTelegram}
                    className="flex flex-col items-center gap-1 py-2.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl text-[10px] font-black hover:bg-sky-500/20 transition-all">
                    <Share2 size={14} /> Telegram
                  </button>
                  <button onClick={() => {
                    const msg = `🎁 Earn ₹${friendGets} cashback on ${offer.name}! ${result.link}`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                    className="flex flex-col items-center gap-1 py-2.5 bg-foreground/5 border border-border text-foreground rounded-xl text-[10px] font-black hover:bg-foreground/10 transition-all">
                    <ArrowUpRight size={14} /> X
                  </button>
                  <button onClick={() => window.open(result.trackerLink, '_blank')}
                    className="flex flex-col items-center gap-1 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[10px] font-black hover:bg-amber-500/20 transition-all">
                    <BarChart2 size={14} /> Tracker
                  </button>
                </div>

                {/* Native share */}
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button onClick={() => {
                    navigator.share({ title: `${offer.name} Referral`, text: `Earn ₹${friendGets} cashback!`, url: result.link }).catch(() => {});
                  }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-black hover:bg-primary/20 transition-all">
                    <Zap size={13} /> Share via other apps
                  </button>
                )}

                <button onClick={onClose}
                  className="w-full py-2.5 border border-border text-muted-foreground rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-all">
                  Done
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
