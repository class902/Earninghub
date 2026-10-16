import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface Props {
  offerName?: string;
  reason?: string;
}

export default function ExpiredOfferFallback({ offerName, reason }: Props) {
  const { settings } = useAppContext();
  const siteName = settings?.siteName || 'EarningHub';
  const telegramLink = settings?.telegramLink || '';
  const socialLinks = settings?.socialLinks || [];

  const socialIcons: Record<string, string> = {
    telegram: '✈️', whatsapp: '💬', instagram: '📸', youtube: '▶️',
    twitter: '🐦', facebook: '📘', linkedin: '💼',
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full blur-3xl opacity-[0.04] pointer-events-none top-[-20%] left-[-20%]"
        style={{ background: 'hsl(var(--primary))' }} />
      <div className="absolute w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] rounded-full blur-3xl opacity-[0.04] pointer-events-none bottom-[-15%] right-[-15%]"
        style={{ background: '#f0b429' }} />

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl border border-border p-8 text-center shadow-2xl"
          style={{ background: 'rgba(10,18,40,0.65)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}
        >
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          {/* Illustration */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 260 }}
            className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl relative"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            ⏰
            <motion.div
              className="absolute inset-0 rounded-full border border-red-400/30"
              animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-syne font-black text-2xl text-foreground mb-2"
          >
            Sorry, You&apos;re Late! 🥺
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-muted-foreground text-sm leading-relaxed mb-2"
          >
            {reason || 'This exclusive offer has expired or reached its limit.'}
          </motion.p>

          {offerName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-full mb-4"
            >
              <span className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-xs font-bold text-destructive">{offerName} — Offer Ended</span>
            </motion.div>
          )}

          {/* Divider */}
          <div className="border-t border-border/40 my-5" />

          {/* Social CTA section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-4"
          >
            <div>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">🔔 Never Miss the Next Deal</p>
              <p className="text-sm text-foreground font-semibold">Join our community to get notified first!</p>
            </div>

            {/* Telegram CTA — always shown prominently if configured */}
            {telegramLink && (
              <motion.a
                href={telegramLink}
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-syne font-black text-sm text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #2481cc 0%, #1a6eb5 100%)', boxShadow: '0 8px 24px rgba(36,129,204,0.35)' }}
              >
                <div className="card-shine" />
                <span className="text-lg">✈️</span>
                Join our Telegram — Get Next Loot First!
                <ExternalLink size={13} className="opacity-70" />
              </motion.a>
            )}

            {/* Other social links */}
            {socialLinks.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {socialLinks.slice(0, 4).map((link, i) => {
                  const name = link.name?.toLowerCase() || '';
                  const icon = Object.entries(socialIcons).find(([k]) => name.includes(k))?.[1] || '🔗';
                  return (
                    <motion.a
                      key={link.id || i}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      whileHover={{ y: -1 }}
                      className="flex items-center justify-center gap-2 py-2.5 bg-background border border-border rounded-xl text-xs font-bold text-foreground hover:border-primary hover:text-primary transition-all"
                    >
                      <span className="text-base">{icon}</span>
                      {link.name}
                    </motion.a>
                  );
                })}
              </div>
            )}

            {/* Browse all offers */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Link to="/"
                className="flex items-center justify-center gap-2 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-black hover:bg-primary/20 transition-all">
                🎯 Browse Live Offers
              </Link>
              <Link to="/"
                className="flex items-center justify-center gap-2 py-2.5 bg-background border border-border text-muted-foreground rounded-xl text-xs font-bold hover:border-primary hover:text-primary transition-all">
                <ArrowLeft size={12} /> Back to {siteName}
              </Link>
            </div>
          </motion.div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[11px] text-muted-foreground mt-4"
        >
          Follow us to get instant alerts on exclusive cashback offers 🚀
        </motion.p>
      </div>
    </div>
  );
}
