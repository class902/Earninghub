import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getOffers } from 'zitejs/api';
import TrackLeadPanel from '@/components/TrackLeadPanel';
import PayoutTicker from '@/components/PayoutTicker';
import { useAppContext } from '@/contexts/AppContext';
import type { Offer } from '@/types';
import PageTransition from '@/components/PageTransition';

export default function TrackLeadPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const { settings } = useAppContext();
  const telegramLink = settings?.telegramLink || '';
  const supportEmail = settings?.supportEmail || '';
  const webLogoUrl = settings?.webLogoUrl;
  const siteName = settings?.siteName || 'EarningHub';
  const trackByUpi = settings?.trackByUpi ?? true;
  const trackByName = settings?.trackByName ?? true;
  const searchHint = (trackByUpi && trackByName)
    ? 'Enter your UPI ID, name, or mobile number to instantly check all your cashback applications.'
    : trackByUpi
      ? 'Enter your UPI ID to instantly check the status of all your cashback applications.'
      : 'Enter your full name or mobile number to instantly check the status of your cashback applications.';

  useEffect(() => {
    window.scrollTo({ top: 0 });
    getOffers({}).catch(() => ({ offers: [] as Offer[] })).then(o => setOffers(o.offers));
  }, []);

  const offerPayouts = offers.filter(o => o.status === 'Active').map(o => ({ name: o.name, payout: o.payout }));

  return (
    <PageTransition className="min-h-screen bg-background font-satoshi">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="blob w-[55vw] h-[55vw] max-w-[480px] max-h-[480px] absolute -top-[10%] -right-[10%] bg-primary opacity-[0.04]" />
        <div className="blob w-[40vw] h-[40vw] max-w-[360px] max-h-[360px] absolute -bottom-[10%] -left-[10%] bg-blue-400 opacity-[0.035]" />
      </div>

      {/* Nav */}
      <div className="sticky top-0 z-20 px-4 md:px-8 py-3 flex items-center justify-between border-b border-border/40 backdrop-blur-xl bg-background/90">
        <Link to="/" className="flex items-center gap-2.5">
          {webLogoUrl ? (
            <img src={webLogoUrl} alt={siteName} className="h-7 w-auto object-contain"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-lg bg-gradient-to-br from-primary to-blue-400 blue-glow-sm">
                💰
              </div>
              <span className="font-syne font-black text-base text-foreground">
                {siteName}
              </span>
            </>
          )}
        </Link>
        <Link to="/"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all text-xs font-semibold">
          ← Back to Offers
        </Link>
      </div>

      {/* Page header */}
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-2">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
          className="text-center mb-7">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 260 }}
            className="w-14 h-14 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ boxShadow: '0 0 32px hsl(var(--primary) / 0.1)' }}>
            🔍
          </motion.div>
          <h1 className="font-syne font-black text-2xl md:text-3xl text-foreground mb-1.5 leading-tight">
            Cashback <span className="text-primary">Tracker</span>
          </h1>
          <p className="text-muted-foreground text-xs max-w-xs mx-auto leading-relaxed">
            {searchHint}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.42 }}>
          <TrackLeadPanel offers={offers} telegramLink={telegramLink} supportEmail={supportEmail} />
        </motion.div>
      </div>

      <PayoutTicker offerPayouts={offerPayouts} />
    </PageTransition>
  );
}
