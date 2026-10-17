import { appOrigin } from '@/lib/appUrl';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, MessageCircle, BarChart2, Link2, Loader2, ArrowUpRight, Zap, Info } from 'lucide-react';
import { getReferralOffers, generateReferralLink, GetReferralOffersOutputType } from '@/lib/api';
import { toast } from 'sonner';
import { Toaster } from '@project/components/ui/sonner';

type ReferralOffer = GetReferralOffersOutputType['offers'][0];

interface ReferrerField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  validationRegex?: string;
  validationMessage?: string;
  options?: string[];
}

export default function ReferralGeneratorPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [offer, setOffer] = useState<ReferralOffer | null>(null);
  const [formFields, setFormFields] = useState<ReferrerField[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ link: string; trackerLink: string; code: string; isExisting: boolean; referrerCut: number; userCut: number } | null>(null);
  const [copied, setCopied] = useState<'link' | 'tracker' | null>(null);

  const [referrerCut, setReferrerCut] = useState(0);
  const [userCut, setUserCut] = useState(0);
  const [adminCut, setAdminCut] = useState(0);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    getReferralOffers({}).then(r => {
      const found = r.offers.find(o => o.slug === slug);
      if (found) {
        setOffer(found);
        const ac = found.referralAdminCut || 0;
        const rc = found.referralDefaultReferrerCut || 0;
        const uc = found.referralDefaultUserEstimate || 0;
        setAdminCut(ac);
        if (rc > 0 || uc > 0) {
          setReferrerCut(rc);
          setUserCut(uc);
        } else {
          const dist = (found.payout || 0) - ac;
          setReferrerCut(Math.round(dist / 2));
          setUserCut(dist - Math.round(dist / 2));
        }
        try {
          const fields = JSON.parse(found.referrerFormConfig || '[]');
          if (Array.isArray(fields)) setFormFields(fields);
        } catch {}
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  // Load saved UPI from localStorage for convenience
  useEffect(() => {
    const saved = localStorage.getItem('eh_referrer_upi');
    if (saved && !formValues['_upi']) {
      setFormValues(v => ({ ...v, _upi: saved }));
    }
  }, []);

  function getFieldError(field: ReferrerField): string | null {
    const val = (formValues[field.id] || '').trim();
    if (field.required && !val) return `${field.label} is required`;
    if (val && field.validationRegex) {
      try {
        if (!new RegExp(field.validationRegex).test(val)) return field.validationMessage || 'Invalid format';
      } catch {}
    }
    return null;
  }

  function handleSliderChange(newReferrerCut: number) {
    const distributable = (offer?.payout || 0) - adminCut;
    const clamped = Math.max(0, Math.min(distributable, newReferrerCut));
    setReferrerCut(clamped);
    setUserCut(distributable - clamped);
  }

  async function handleSubmit() {
    if (!offer) return;
    for (const field of formFields) {
      const err = getFieldError(field);
      if (err) { toast.error(err); return; }
    }
    const upiField = formFields.find(f => f.label.toLowerCase().includes('upi'));
    const nameField = formFields.find(f => f.label.toLowerCase().includes('name'));
    const upiVal = upiField ? (formValues[upiField.id] || '').trim() : '';
    const nameVal = nameField ? (formValues[nameField.id] || '').trim() : 'Referrer';

    const effectiveUpi = upiVal || (formValues['_upi'] || '').trim();
    const effectiveName = nameVal !== 'Referrer' ? nameVal : (formValues['_name'] || '').trim() || 'Referrer';

    if (!effectiveUpi || effectiveUpi.length < 3) {
      toast.error('Please enter your UPI ID');
      return;
    }
    if (!effectiveName || effectiveName === 'Referrer') {
      toast.error('Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      const distributable = (offer.payout || 0) - adminCut;
      const splitPct = distributable > 0 ? Math.round((referrerCut / distributable) * 100) : 50;
      
      const res = await generateReferralLink({
        offerSlug: offer.slug,
        offerName: offer.name,
        referrerName: effectiveName,
        customReferrerData: JSON.stringify(formValues),
        referrerSplit: String(splitPct),
        referrerUpi: effectiveUpi,
        referrerCut,
        userCut,
      });

      // Save UPI for future convenience
      localStorage.setItem('eh_referrer_upi', effectiveUpi);

      const appUrl = appOrigin();
      const refLink = `${appUrl}/${offer.slug}.ref/${res.code}`;
      const trackLink = `${appUrl}/${offer.slug}.track/${res.code}`;

      setResult({ link: refLink, trackerLink: trackLink, code: res.code, isExisting: res.isExisting, referrerCut: res.referrerCut, userCut: res.userCut });
      if (res.isExisting) {
        toast.info('You already have a referral link for this offer! Showing your existing link.');
      } else {
        toast.success('Referral link generated! 🎉');
      }
    } catch (e) {
      toast.error(String((e as { message?: string })?.message || 'Failed to generate link'));
    } finally {
      setSubmitting(false);
    }
  }

  function copyText(text: string, type: 'link' | 'tracker') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function handleNativeShare(text: string, url: string) {
    if (navigator.share) {
      try { await navigator.share({ title: `Referral - ${offer?.name}`, text, url }); return; } catch {}
    }
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  }

  const distributable = offer ? (offer.payout || 0) - adminCut : 0;
  const sliderPct = distributable > 0 ? (referrerCut / distributable) * 100 : 50;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Toaster position="top-center" richColors />
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-bold">Loading offer…</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Toaster position="top-center" richColors />
        <div className="text-center bg-card border border-border rounded-2xl p-8 max-w-sm">
          <p className="text-4xl mb-3">😔</p>
          <h2 className="font-syne font-black text-xl text-foreground mb-2">Offer Not Found</h2>
          <p className="text-sm text-muted-foreground">This offer doesn't exist or referral is not enabled for it.</p>
        </div>
      </div>
    );
  }

  // Result screen
  if (result) {
    const youGet = result.referrerCut;
    const friendGets = result.userCut;
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <Toaster position="top-center" richColors />
        <div className="max-w-md mx-auto space-y-5">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-3">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(99,102,241,0.15))', border: '1px solid rgba(16,185,129,0.3)' }}>
              🎉
            </motion.div>
            <h2 className="font-syne font-black text-xl text-foreground">
              {result.isExisting ? 'Your Existing Links' : 'Links Generated!'}
            </h2>
            <p className="text-sm text-muted-foreground">Share the referral link with friends & track your earnings</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-0.5">YOU EARN</p>
              <p className="font-syne font-black text-xl text-primary">₹{youGet}</p>
              <p className="text-[10px] text-muted-foreground">per referral</p>
            </div>
            <div className="text-center p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-0.5">FRIEND GETS</p>
              <p className="font-syne font-black text-xl text-amber-400">₹{friendGets}</p>
              <p className="text-[10px] text-muted-foreground">on completion</p>
            </div>
          </div>

          {/* Shareable Referral Link */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 size={14} className="text-emerald-400" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">🔗 Shareable Referral Link</p>
            </div>
            <div className="bg-background border border-border rounded-xl px-3 py-2.5">
              <p className="text-xs font-mono text-foreground break-all">{result.link}</p>
            </div>
            <button onClick={() => copyText(result.link, 'link')}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${copied === 'link' ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}>
              {copied === 'link' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'link' ? 'Copied!' : 'Copy Referral Link'}
            </button>

            {/* Share buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => {
                const msg = `🎁 Complete this offer and earn ₹${friendGets} cashback!\n🔗 ${result.link}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
              }} className="flex items-center justify-center gap-1.5 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-[10px] font-black hover:bg-green-500/20 transition-all">
                <MessageCircle size={12} /> WhatsApp
              </button>
              <button onClick={() => {
                const msg = `🎁 Earn ₹${friendGets} cashback! Use my link: ${result.link}`;
                window.open(`https://t.me/share/url?url=${encodeURIComponent(result.link)}&text=${encodeURIComponent(msg)}`, '_blank');
              }} className="flex items-center justify-center gap-1.5 py-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl text-[10px] font-black hover:bg-sky-500/20 transition-all">
                <Share2 size={12} /> Telegram
              </button>
              <button onClick={() => {
                const msg = `🎁 Earn ₹${friendGets} cashback on ${offer.name}! ${result.link}`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`, '_blank');
              }} className="flex items-center justify-center gap-1.5 py-2 bg-foreground/5 border border-border text-foreground rounded-xl text-[10px] font-black hover:bg-foreground/10 transition-all">
                <ArrowUpRight size={12} /> X
              </button>
            </div>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button onClick={() => handleNativeShare(`Earn ₹${friendGets} cashback!`, result.link)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-black hover:bg-primary/20 transition-all">
                <Zap size={13} /> Share via other apps
              </button>
            )}
          </div>

          {/* Tracker Link */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-primary" />
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">📊 Your Tracker Link (Private)</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Use this to track your referral earnings. Do NOT share this link — it's your private dashboard.</p>
            <div className="bg-background border border-border rounded-xl px-3 py-2.5">
              <p className="text-xs font-mono text-foreground break-all">{result.trackerLink}</p>
            </div>
            <button onClick={() => copyText(result.trackerLink, 'tracker')}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${copied === 'tracker' ? 'bg-primary/20 border border-primary/40 text-primary' : 'bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20'}`}>
              {copied === 'tracker' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'tracker' ? 'Copied!' : 'Copy Tracker Link'}
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            💡 Bookmark your tracker link to check earnings anytime
          </p>
        </div>
      </div>
    );
  }

  // Form screen
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <Toaster position="top-center" richColors />
      <div className="max-w-md mx-auto space-y-6">
        {/* Offer header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(240,180,41,0.15))', border: '1px solid rgba(99,102,241,0.25)' }}>
            {offer.logoUrl ? <img src={offer.logoUrl} alt="" className="w-full h-full object-cover rounded-2xl" /> : <span className="text-3xl">{offer.emoji}</span>}
          </div>
          <h1 className="font-syne font-black text-xl text-foreground">Generate Referral Link</h1>
          <p className="text-sm text-muted-foreground">{offer.name} · Earn up to ₹{distributable}</p>
        </motion.div>

        {/* Payout Split */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">💰 Customize Payout Split</p>
            <div className="group relative">
              <Info size={13} className="text-muted-foreground cursor-help" />
              <div className="absolute right-0 top-6 w-48 p-2 bg-card border border-border rounded-lg text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                Slide to choose how much you keep vs what your friend gets as cashback.
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Custom styled slider */}
            <div className="relative pt-1">
              <input
                type="range"
                min={0} max={distributable} step={5}
                value={referrerCut}
                onChange={e => handleSliderChange(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full"
              />
              {/* Percentage indicator */}
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground">0%</span>
                <span className="text-[9px] text-primary font-black">{Math.round(sliderPct)}% to you</span>
                <span className="text-[9px] text-muted-foreground">100%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-[10px] font-black text-primary uppercase tracking-wider">YOU</p>
                <p className="font-syne font-black text-lg text-primary">₹{referrerCut}</p>
              </div>
              <div className="text-center p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">FRIEND</p>
                <p className="font-syne font-black text-lg text-amber-400">₹{userCut}</p>
              </div>
            </div>

            {/* Tip for higher friend share */}
            {userCut > referrerCut && (
              <p className="text-[10px] text-emerald-400 font-bold text-center flex items-center justify-center gap-1">
                💡 Higher friend share = more conversions!
              </p>
            )}
            {referrerCut > userCut && userCut > 0 && (
              <p className="text-[10px] text-amber-400/70 font-bold text-center flex items-center justify-center gap-1">
                💡 Tip: Give friends more to boost signups
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <span>You: ₹{referrerCut} + Friend: ₹{userCut} = ₹{referrerCut + userCut}</span>
              {referrerCut + userCut === distributable && (
                <span className="text-emerald-400 font-black">✓</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Referrer Details Form */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">📝 Your Details</p>
          
          {formFields.length === 0 ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name *</label>
                <input value={formValues['_name'] || ''} onChange={e => setFormValues(v => ({ ...v, _name: e.target.value }))}
                  placeholder="Your full name" className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">UPI ID *</label>
                <input value={formValues['_upi'] || ''} onChange={e => setFormValues(v => ({ ...v, _upi: e.target.value }))}
                  placeholder="yourname@upi" className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors" />
                <p className="text-[9px] text-muted-foreground mt-1">Earnings will be sent to this UPI</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {formFields.map(field => (
                <div key={field.id}>
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </label>
                  {field.type === 'dropdown' && field.options ? (
                    <select
                      value={formValues[field.id] || ''}
                      onChange={e => setFormValues(v => ({ ...v, [field.id]: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors"
                    >
                      <option value="">Select…</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                      value={formValues[field.id] || ''}
                      onChange={e => setFormValues(v => ({ ...v, [field.id]: e.target.value }))}
                      placeholder={field.placeholder || ''}
                      className="w-full px-3 py-2.5 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Link Preview */}
        {(formValues['_upi'] || '').trim().length > 2 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="bg-muted/10 border border-border/50 rounded-xl p-3 space-y-1 overflow-hidden">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">LINK PREVIEW</p>
            <p className="text-[10px] text-muted-foreground">Your link will look like:</p>
            <p className="text-xs font-mono text-primary break-all">{appOrigin()}/{offer.slug}.ref/xxxxxxxx</p>
          </motion.div>
        )}

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 font-syne font-black text-base text-black rounded-2xl transition-all hover:opacity-90 disabled:opacity-60 shadow-xl"
            style={{ background: 'linear-gradient(135deg, #f0b429, #ff5722)', boxShadow: '0 8px 32px rgba(240,180,41,0.35)' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Generating…</span>
            ) : (
              '🚀 Generate My Referral Link'
            )}
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            One UPI = One Link per offer. If you already have a link, it will be shown.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
