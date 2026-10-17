import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { submitLead } from '@/lib/api';
import { toast } from 'sonner';
import WiFiWarning from '@/components/WiFiWarning';
import type { Offer, LeadFieldDef } from '@/types';
import { DEFAULT_LEAD_FIELDS } from '@/types';

interface Props {
  offer: Offer;
  onClose: () => void;
  leadFieldsConfig?: LeadFieldDef[];
}

export default function OfferModal({ offer, onClose, leadFieldsConfig }: Props) {
  const navigate = useNavigate();
  const activeFields = (leadFieldsConfig || DEFAULT_LEAD_FIELDS).filter(f => f.enabled);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [leadId, setLeadId] = useState('');
  const [showWifi, setShowWifi] = useState(false);

  function setVal(key: string, v: string) {
    setValues(p => ({ ...p, [key]: v }));
    setErrors(e => ({ ...e, [key]: false }));
  }

  async function handleSubmit() {
    const errs: Record<string, boolean> = {};
    activeFields.forEach(f => { if (f.required && !values[f.id]?.trim()) errs[f.id] = true; });
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Please fill all required fields'); return; }

    setLoading(true);
    try {
      const labeled: Record<string, string> = {};
      activeFields.forEach(f => { labeled[f.label] = values[f.id] || ''; });
      const summary = values['name'] || values['upiId'] || Object.values(values)[0] || '';
      const upiValue = (values['upiId'] || '').trim();
      const referredBy = sessionStorage.getItem('eh_referrer') || undefined;
      const referralCode = sessionStorage.getItem('eh_ref_code') || undefined;
      const res = await submitLead({
        offerName: offer.name,
        offerPayout: offer.payout,
        summary,
        leadData: JSON.stringify(labeled),
        upiId: upiValue,
        referredBy,
        referralCode: referralCode || undefined,
      });
      if (res.isDuplicate) {
        onClose();
        navigate(`/user-lead-track?upi=${encodeURIComponent(upiValue)}`);
        return;
      }
      setLeadId(res.refId);
      setSuccess(true);
      // Store redirect link validity for later use
      if (!/^https?:\/\/.+/i.test(offer.redirectLink || '')) {
        toast.info('Lead saved! Offer link is being set up — contact support if needed.');
      }
    } catch {
      toast.error('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLeadId() {
    await navigator.clipboard.writeText(leadId).catch(() => {});
    toast.success('Lead ID copied! 📋');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!success ? onClose : undefined}
      />

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 w-full max-w-md mx-auto bg-card border border-border rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '94dvh' }}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 'calc(94dvh - 16px)' }}>
          {/* Banner */}
          {offer.bannerUrl && (
            <div className="relative h-28 overflow-hidden">
              <img src={offer.bannerUrl} alt={offer.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
            </div>
          )}

          {/* Offer Header */}
          <div
            className="px-5 pt-4 pb-4 border-b border-border"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, transparent 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl flex-shrink-0 shadow-sm overflow-hidden">
                {offer.logoUrl ? (
                  <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : offer.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-syne font-black text-base text-foreground leading-tight">{offer.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{offer.category}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-syne font-black text-gold text-xl">{(offer as any).payoutDisplay || `₹${offer.payout}`}</span>
                  <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">cashback</span>
                </div>
              </div>
              <button onClick={onClose} className="flex-shrink-0 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
                ✕
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 py-5 space-y-4 pb-8">
                {/* Sample Screenshot */}
                {offer.sampleScreenshotUrl && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-amber-500/30 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, transparent 100%)' }}>
                    <div className="px-4 py-2.5 border-b border-amber-500/20">
                      <p className="text-xs font-black text-amber-400 flex items-center gap-1.5">📸 Sample Reference Screenshot</p>
                    </div>
                    <div className="p-3">
                      <img src={offer.sampleScreenshotUrl} alt="Sample completion screenshot"
                        className="w-full rounded-lg border border-border/30 object-cover"
                        onError={e => ((e.currentTarget.closest('div.p-3') as HTMLElement).style.display = 'none')} />
                      <p className="text-[10px] text-muted-foreground mt-2 text-center">This is what the completed offer should look like</p>
                    </div>
                  </motion.div>
                )}
                <div>
                  <p className="font-syne font-black text-foreground text-base">Your Details</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter the details you used while completing this offer</p>
                </div>

                {activeFields.map((f, i) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      {f.label} {f.required && <span className="text-destructive">*</span>}
                    </label>
                    <input
                      type={f.type}
                      value={values[f.id] || ''}
                      onChange={e => setVal(f.id, e.target.value)}
                      placeholder={f.placeholder}
                      className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground text-sm focus:outline-none transition-colors font-satoshi ${errors[f.id] ? 'border-destructive' : 'border-border focus:border-primary'}`}
                    />
                    {errors[f.id] && <p className="text-destructive text-xs mt-1">⚠ This field is required</p>}
                  </motion.div>
                ))}

                <motion.button
                  onClick={handleSubmit}
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-syne font-black text-sm text-white bg-gradient-to-r from-primary to-blue-400 hover:opacity-90 disabled:opacity-60 transition-all shadow-lg mt-2"
                >
                  {loading ? '⏳ Saving...' : '✓ Submit & Continue to Offer →'}
                </motion.button>

                <p className="text-xs text-muted-foreground text-center pb-2">
                  🔒 Used only for cashback verification. Your data is safe.
                </p>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-5 py-8 text-center pb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-3xl mx-auto mb-4"
                >
                  🎉
                </motion.div>
                <h3 className="font-syne font-black text-xl text-foreground mb-1">Lead Saved!</h3>
                <p className="text-muted-foreground text-sm mb-5">Details recorded for <strong className="text-foreground">{offer.name}</strong>.</p>

                <div className="bg-card border border-border rounded-2xl p-4 mb-5">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-2">Your Lead ID</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-syne font-black text-2xl text-primary">{leadId}</span>
                    <button onClick={copyLeadId} className="text-xs px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg font-bold hover:bg-primary/20 transition-all">📋</button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Use this ID to track your cashback status</p>
                </div>

                <button onClick={() => {
                    if (/^https?:\/\/.+/i.test(offer.redirectLink || '')) setShowWifi(true);
                    else toast.error('Offer link is not configured yet.');
                  }}
                  disabled={!/^https?:\/\/.+/i.test(offer.redirectLink || '')}
                  className="w-full py-4 rounded-2xl font-syne font-black text-sm text-white bg-gradient-to-r from-primary to-blue-400 hover:opacity-90 transition-all shadow-lg mb-3 disabled:opacity-50">
                  {/^https?:\/\/.+/i.test(offer.redirectLink || '') ? '🚀 Continue to Brand Page →' : '⏳ Offer Link Coming Soon'}
                </button>
                <button onClick={onClose} className="w-full py-2 text-muted-foreground text-sm font-semibold hover:text-foreground transition-colors">
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {showWifi && (
        <WiFiWarning
          onConfirm={() => { setShowWifi(false); window.open(offer.redirectLink, '_blank'); onClose(); }}
          onClose={() => setShowWifi(false)}
        />
      )}
    </div>
  );
}
