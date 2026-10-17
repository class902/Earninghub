import { appOrigin } from '@/lib/appUrl';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Copy, ExternalLink, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';

export default function ReferSection() {
  const { settings } = useAppContext();
  const siteName = settings?.siteName || 'EarningHub';
  const bonusYou = settings?.referralBonusYou ?? 50;
  const bonusFriend = settings?.referralBonusFriend ?? 25;
  const minOffers = settings?.referralMinOffers ?? 1;
  const referralTerms = settings?.referralTerms || '';

  const [upiInput, setUpiInput] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  function generateLink() {
    const upi = upiInput.trim();
    if (!upi || upi.length < 3) {
      toast.error('Enter your UPI ID to generate your referral link');
      return;
    }
    const link = `${appOrigin()}/?ref=${encodeURIComponent(upi)}`;
    setGeneratedLink(link);
  }

  function handleCopyLink() {
    const link = generatedLink || `${appOrigin()}/?ref=yourUPI`;
    navigator.clipboard
      .writeText(link)
      .then(() => toast.success('Referral link copied! Share it to start earning. 🎉'))
      .catch(() => toast.error('Could not copy — try manually: ' + link));
  }

  return (
    <section id="refer" className="relative z-10 px-5 md:px-[5%] py-16 overflow-hidden">
      <div className="blob absolute w-[55vw] h-[55vw] max-w-[600px] max-h-[600px] top-[-10%] left-[-15%] pointer-events-none opacity-[0.05]"
        style={{ background: '#f0b429' }} />
      <div className="blob absolute w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] bottom-[-10%] right-[-12%] pointer-events-none opacity-[0.05]"
        style={{ background: '#ff5722' }} />

      <motion.div
        initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-3xl overflow-hidden border border-border"
        style={{ background: 'rgba(10, 18, 40, 0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 0 80px rgba(240,180,41,0.06), 0 32px 64px rgba(0,0,0,0.3)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold/80 via-fire/60 to-transparent" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-stretch">
          {/* Left — text + UPI input */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            <motion.p initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-xs font-black uppercase tracking-widest text-gold mb-3 inline-flex items-center gap-2">
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 2 }}
                className="w-2 h-2 rounded-full bg-gold inline-block shadow-[0_0_6px_rgba(240,180,41,0.8)]" />
              Referral Program
            </motion.p>

            <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.15 }}
              className="font-syne font-black text-3xl md:text-4xl lg:text-5xl text-foreground mb-4 leading-tight">
              Refer &amp; <span className="gradient-text-gold">Earn Big</span>
            </motion.h2>

            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              viewport={{ once: true }} transition={{ delay: 0.22 }}
              className="text-muted-foreground text-base mb-6 leading-relaxed max-w-md">
              Share your unique link and earn{' '}
              <strong className="text-foreground font-black">₹{bonusYou}</strong> for every friend who
              joins and completes {minOffers > 1 ? `${minOffers} offers` : 'their first offer'}. No cap on earnings!
            </motion.p>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.28 }}
              className="flex items-center gap-5 mb-6">
              {[
                { val: `₹${bonusYou}`, label: 'You earn' },
                { val: `₹${bonusFriend}`, label: 'Friend gets' },
                { val: '∞', label: 'No limit' },
              ].map((s, i) => (
                <motion.div key={s.label}
                  initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: 0.32 + i * 0.07, type: 'spring', stiffness: 260 }}
                  className="text-center">
                  <p className="font-syne font-black text-xl text-gold leading-none">{s.val}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">{s.label}</p>
                </motion.div>
              ))}
              <div className="w-px h-8 bg-border" />
            </motion.div>

            {/* UPI Input */}
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.34 }}
              className="space-y-3 mb-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">💳</span>
                <input type="text" value={upiInput} onChange={e => setUpiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && generateLink()}
                  placeholder="Enter your UPI ID (yourname@upi)"
                  className="w-full pl-10 pr-4 py-3 bg-background/60 border border-border/60 text-foreground text-sm rounded-xl focus:outline-none focus:border-gold transition-colors font-satoshi placeholder:text-muted-foreground/50" />
              </div>
              <motion.button onClick={generateLink} whileHover={{ y: -1, scale: 1.01 }} whileTap={{ scale: 0.97 }}
                className="w-full inline-flex items-center justify-center gap-2 font-syne font-black text-sm text-black px-6 py-3 rounded-xl transition-all relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #f0b429 0%, #ff5722 100%)', boxShadow: '0 6px 20px rgba(240,180,41,0.3)' }}>
                <div className="card-shine" />
                🔗 Generate My Referral Link
              </motion.button>
              <Link to="/refer" className="w-full inline-flex items-center justify-center gap-2 font-syne font-black text-xs text-primary px-6 py-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all">
                🎯 Browse Offer-Specific Referral Links <ArrowRight size={14} />
              </Link>
            </motion.div>

            {/* Generated Link Display */}
            <AnimatePresence>
              {generatedLink && (
                <motion.div initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="p-4 bg-green-500/5 border border-green-500/25 rounded-xl space-y-3">
                    <p className="text-xs font-black text-green-400 uppercase tracking-wider">✓ Your Referral Link</p>
                    <div className="bg-background/60 border border-border/40 rounded-lg px-3 py-2">
                      <p className="text-xs text-foreground font-mono break-all leading-relaxed">{generatedLink}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCopyLink}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-black rounded-lg hover:bg-green-500/20 transition-all">
                        <Copy size={12} /> Copy Link
                      </button>
                      <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`🎁 Join ${siteName} & earn cashback on top brands!
Get ₹${bonusFriend} welcome bonus + I earn ₹${bonusYou} for referring you!
${generatedLink}`)}`, '_blank')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-background/50 border border-border/40 text-muted-foreground text-xs font-black rounded-lg hover:border-green-400 hover:text-green-400 transition-all">
                        <ExternalLink size={12} /> Share on WhatsApp
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {referralTerms && (
              <p className="text-[10px] text-muted-foreground/70 mt-3 leading-relaxed border-t border-border/30 pt-3">
                {referralTerms}
              </p>
            )}
          </div>

          {/* Right — showcase */}
          <div className="relative flex items-center justify-center p-8 md:p-12 border-t md:border-t-0 md:border-l border-border/40">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 50%, rgba(240,180,41,0.07) 0%, transparent 70%)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.88 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="relative text-center w-full">
              <div className="space-y-3 mb-6">
                {[
                  { step: '1', text: 'Enter your UPI ID above', emoji: '💳' },
                  { step: '2', text: 'Share your unique link', emoji: '🔗' },
                  { step: '3', text: `Friend signs up & completes ${minOffers > 1 ? `${minOffers} offers` : 'an offer'}`, emoji: '✅' },
                  { step: '4', text: `You earn ₹${bonusYou} to your UPI!`, emoji: '💰' },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3 text-left p-3 bg-background/30 border border-border/30 rounded-xl">
                    <span className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold font-black text-xs flex-shrink-0">{s.step}</span>
                    <span className="text-sm text-muted-foreground">{s.emoji} {s.text}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl px-8 py-5 border border-gold/25 relative overflow-hidden"
                style={{ background: 'rgba(240,180,41,0.06)', boxShadow: '0 0 40px rgba(240,180,41,0.12), inset 0 0 20px rgba(240,180,41,0.04)' }}>
                <motion.div className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ border: '1px solid rgba(240,180,41,0.3)' }}
                  animate={{ scale: [1, 1.03, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 3 }} />
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Per Successful Referral</p>
                <div className="font-syne font-black text-5xl md:text-6xl text-gold leading-none text-glow-gold">
                  ₹{bonusYou}
                </div>
                <p className="text-sm font-bold text-foreground mt-2">credited to your UPI</p>
                <p className="text-xs text-muted-foreground mt-1">+ friend gets ₹{bonusFriend} welcome bonus</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
