import { appPath } from '@/lib/appUrl';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Timer } from 'lucide-react';
import type { Offer } from '@/types';

export interface PromoConfig {
  enabled: boolean;
  bannerUrl: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  offerLink: string;
  redirectLink: string;
  cashbackFormEnabled: boolean;
  // Configurable popup timing
  delay?: number;      // seconds before popup appears (default 3)
  autoClose?: number;  // seconds before auto-close (0 = no auto-close)
}

interface Props {
  config: PromoConfig;
  offers: Offer[];
  onSelectOffer: (offer: Offer) => void;
}

export default function PromoPopup({ config, offers, onSelectOffer }: Props) {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const delayMs = ((config.delay ?? 3) * 1000) || 3000;
  const autoCloseSeconds = config.autoClose ?? 0;

  // Show popup on EVERY page load — but only when there's meaningful content to show
  const hasContent = Boolean(config.bannerUrl) || Boolean(config.title);
  const hasCTA = Boolean(config.redirectLink?.trim()) || Boolean(config.offerLink?.trim()) || config.cashbackFormEnabled;
  useEffect(() => {
    if (!config.enabled) return;
    if (!hasContent || !hasCTA) return; // Don't show an empty popup with just "Maybe Later"
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [config.enabled, hasContent, hasCTA, delayMs]);

  // Auto-close countdown timer
  useEffect(() => {
    if (!visible || autoCloseSeconds <= 0) return;
    setCountdown(autoCloseSeconds);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, autoCloseSeconds]);

  function dismiss() {
    setVisible(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function handleCTA() {
    const link = config.redirectLink?.trim();
    if (!link) { handleViewOffer(); return; }
    dismiss();
    if (link.startsWith('/')) window.location.href = appPath(link);
    else window.open(link, '_blank');
  }

  function handleViewOffer() {
    const link = config.offerLink?.toLowerCase().trim();
    if (!link) {
      dismiss();
      document.querySelector('#offers')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const match = offers.find(o =>
      o.id === config.offerLink ||
      o.name.toLowerCase().includes(link) ||
      link.includes(o.name.toLowerCase().split(' ')[0])
    );
    dismiss();
    if (match) setTimeout(() => onSelectOffer(match), 350);
    else document.querySelector('#offers')?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleCashbackForm() {
    dismiss();
    document.querySelector('#cashback-forms')?.scrollIntoView({ behavior: 'smooth' });
  }

  const hasRedirectLink = Boolean(config.redirectLink?.trim());
  const hasOfferLink = Boolean(config.offerLink?.trim());
  const ctaText = config.buttonText?.trim() || (hasRedirectLink ? 'Claim Now →' : '🔥 View Top Offer →');

  // Progress bar percentage for auto-close
  const progressPct = autoCloseSeconds > 0 && countdown > 0
    ? (countdown / autoCloseSeconds) * 100
    : 100;

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm"
            onClick={dismiss}
          />

          <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.82, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="relative w-full max-w-sm rounded-3xl overflow-hidden pointer-events-auto"
              style={{
                boxShadow: '0 0 80px rgba(240,180,41,0.22), 0 0 0 1px rgba(240,180,41,0.28), 0 32px 80px rgba(0,0,0,0.72)',
              }}
            >
              {/* Auto-close progress bar */}
              {autoCloseSeconds > 0 && countdown > 0 && (
                <div className="absolute top-0 left-0 right-0 h-1 z-30 bg-white/10">
                  <motion.div
                    className="h-full bg-amber-400"
                    initial={{ width: '100%' }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
              )}

              {/* Close button with countdown indicator */}
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white hover:bg-black/80 transition-all"
              >
                {autoCloseSeconds > 0 && countdown > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-amber-300">
                    <Timer size={10} />
                    {countdown}s
                  </span>
                )}
                <X size={12} />
              </button>

              {/* Banner image */}
              {config.bannerUrl ? (
                <div className={`relative ${hasRedirectLink ? 'cursor-pointer group' : ''}`} onClick={hasRedirectLink ? handleCTA : undefined}>
                  <img
                    src={config.bannerUrl}
                    alt={config.title || 'Special Offer'}
                    className="w-full object-cover block transition-opacity group-hover:opacity-90"
                    style={{ maxHeight: 240 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/20 to-transparent pointer-events-none" />

                  {(config.title || config.subtitle) && (
                    <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                      <motion.span
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
                        className="inline-block text-[10px] font-black uppercase tracking-widest text-gold bg-gold/15 border border-gold/30 px-2.5 py-1 rounded-full mb-2"
                      >
                        🔴 LIVE UPDATE
                      </motion.span>
                      {config.title && (
                        <motion.p
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                          className="font-syne font-black text-xl text-white leading-tight"
                        >
                          {config.title}
                        </motion.p>
                      )}
                      {config.subtitle && (
                        <motion.p
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                          className="text-sm text-white/70 mt-1"
                        >
                          {config.subtitle}
                        </motion.p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card px-6 pt-8 pb-4 text-center border-b border-border">
                  <div className="text-5xl mb-3">🔥</div>
                  {config.title && <p className="font-syne font-black text-xl text-foreground">{config.title}</p>}
                  {config.subtitle && <p className="text-sm text-muted-foreground mt-2">{config.subtitle}</p>}
                </div>
              )}

              {/* Action buttons */}
              <div className="bg-card px-5 py-5 space-y-3 border-t border-border/30">
                {/* Primary animated CTA */}
                {(hasRedirectLink || hasOfferLink) && (
                  <motion.button
                    onClick={handleCTA}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.38 }}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="relative w-full py-4 rounded-xl font-syne font-black text-base text-black overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #f0b429 0%, #ff5722 100%)',
                    }}
                  >
                    {/* Animated glow ring */}
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.05, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{ boxShadow: '0 0 28px rgba(240,180,41,0.7), 0 0 60px rgba(255,87,34,0.4)' }}
                    />
                    {/* Shine sweep */}
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)' }}
                    />
                    <span className="relative z-10">{ctaText}</span>
                  </motion.button>
                )}

                {config.cashbackFormEnabled && (
                  <motion.button
                    onClick={handleCashbackForm}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                    className="w-full py-3.5 rounded-xl font-syne font-black text-sm border border-gold/30 bg-gold/8 text-gold hover:bg-gold/15 transition-all"
                  >
                    💰 Submit Cashback Form →
                  </motion.button>
                )}

                <button
                  onClick={dismiss}
                  className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold flex items-center justify-center gap-1"
                >
                  Maybe Later
                  {autoCloseSeconds > 0 && countdown > 0 && (
                    <span className="text-amber-400/60 font-black">({countdown}s)</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
