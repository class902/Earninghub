import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { getOffers } from 'zitejs/api';
import TrackLeadPanel from '@/components/TrackLeadPanel';
import SiteFooter from '@/components/SiteFooter';
import { findOfferBySlug } from '@/utils/slugify';
import { useAppContext } from '@/contexts/AppContext';
import type { Offer } from '@/types';

export default function OfferTrackPage() {
  const { slug } = useParams<{ slug: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useAppContext();
  const telegramLink = settings?.telegramLink || '';
  const supportEmail = settings?.supportEmail || '';
  const webLogoUrl = settings?.webLogoUrl;
  const siteName = settings?.siteName || 'EarningHub';

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (!slug) { setLoading(false); return; }
    getOffers({}).catch(() => ({ offers: [] as Offer[] })).then((o: { offers: Offer[] }) => {
      setAllOffers(o.offers);
      setOffer(findOfferBySlug(o.offers, slug) || null);
    }).finally(() => setLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-background font-satoshi">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="blob w-[60vw] h-[60vw] max-w-[500px] max-h-[500px] absolute -top-[15%] -right-[15%] bg-primary opacity-[0.04]" />
        <div className="blob w-[40vw] h-[40vw] max-w-[400px] max-h-[400px] absolute -bottom-[10%] -left-[10%] bg-blue-400 opacity-[0.04]" />
      </div>

      <div className="sticky top-0 z-20 glass-nav px-4 md:px-8 py-3 flex items-center justify-between border-b border-border/50">
        <Link to="/" className="flex items-center gap-2.5">
          {webLogoUrl ? (
            <img src={webLogoUrl} alt={siteName} className="h-8 w-auto object-contain"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <>
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center text-base shadow-lg bg-gradient-to-br from-primary to-blue-400">
                <span>💰</span>
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md -z-10" />
              </div>
              <span className="font-syne font-black text-lg text-foreground">
                {siteName}
              </span>
            </>
          )}
        </Link>
        <div className="flex items-center gap-2">
          {offer && (
            <Link to={`/${slug}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all text-sm font-semibold">
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Back to Offer</span>
            </Link>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 md:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl animate-pulse">🔍</div>
            <p className="font-syne font-black text-muted-foreground text-sm">Loading…</p>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
              {offer && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 }}
                  className="flex items-center gap-3 p-3 mb-6 bg-card border border-border rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {offer.logoUrl
                      ? <img src={offer.logoUrl} alt={offer.name} className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      : <span className="text-xs font-black text-primary leading-none select-none">
                          {offer.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                        </span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Tracking Lead For</p>
                    <p className="font-syne font-black text-foreground leading-tight truncate">{offer.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">₹{offer.payout} cashback offer</p>
                  </div>
                  <span className="flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] font-black px-2 py-1 rounded-full flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />LIVE
                  </span>
                </motion.div>
              )}
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl mx-auto mb-4"
                  style={{ boxShadow: '0 0 40px rgba(59,130,246,0.12)' }}>🔍</div>
                <h1 className="font-syne font-black text-2xl md:text-3xl text-foreground mb-2 leading-tight">
                  {offer ? `Track ${offer.name}` : 'Application Tracker'}
                </h1>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
                  Enter your UPI ID to check your cashback submission status.
                </p>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.45 }}>
              <TrackLeadPanel offerNameFilter={offer?.name} offers={allOffers} telegramLink={telegramLink} supportEmail={supportEmail} />
            </motion.div>

            {offer && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center mt-6">
                <Link to={`/${slug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-semibold">
                  <ArrowLeft size={14} />Back to {offer.name} offer
                </Link>
              </motion.div>
            )}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
