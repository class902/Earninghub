import { useNavigate } from 'react-router-dom';
import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import type { Offer } from '@/types';
import { DEFAULT_UI_BUTTONS } from '@/types';
import { slugify } from '@/utils/slugify';
import { useAppContext } from '@/contexts/AppContext';
import DynamicButton from '@/components/DynamicButton';

interface Props {
  offer: Offer;
  onSelect?: (offer: Offer) => void;
  delay?: number;
  isHot?: boolean;
}

// Real countdown — only used when admin explicitly sets expiresAt
function useRealCountdown(expiresAt?: string) {
  const [text, setText] = useState('');
  const [urgent, setUrgent] = useState(false);
  useEffect(() => {
    if (!expiresAt) return;
    function update() {
      const diff = new Date(expiresAt!).getTime() - Date.now();
      if (diff <= 0) { setText('EXPIRED'); setUrgent(true); return; }
      const h = Math.floor(diff / 3600000);
      const d = Math.floor(h / 24);
      const m = Math.floor((diff % 3600000) / 60000);
      setUrgent(h < 24);
      if (d >= 2) setText(`${d} days left`);
      else if (h >= 1) setText(`${h}h ${m}m left`);
      else setText(`${m}m left`);
    }
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return { text, urgent };
}

function OfferCardInner({ offer, delay = 0, isHot = false }: Props) {
  const navigate = useNavigate();
  const { settings } = useAppContext();
  const [imgError, setImgError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  const offerApplyConfig = settings?.uiButtons?.find(b => b.id === 'offer-apply')
    ?? DEFAULT_UI_BUTTONS.find(b => b.id === 'offer-apply')!;
  const tags = offer.tags ? offer.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const isNewUser = tags.some(t => /new\s*user/i.test(t));
  const realTimer = useRealCountdown(offer.expiresAt);

  const hasRealSlots = (offer.totalSlots || 0) > 0;
  const hasTimer = !!offer.expiresAt;
  const showScarcityBar = hasRealSlots || hasTimer;

  const slotsLeft = hasRealSlots ? Math.max(0, offer.totalSlots - (offer.filledSlots || 0)) : 0;
  const slotPct = hasRealSlots && offer.totalSlots > 0
    ? Math.round((slotsLeft / offer.totalSlots) * 100)
    : 0;
  const slotColor = slotsLeft <= 10 ? 'text-red-400' : slotsLeft <= 25 ? 'text-amber-400' : 'text-emerald-400';
  const slotBarColor = slotsLeft <= 10
    ? 'from-red-500 to-orange-500'
    : slotsLeft <= 25
    ? 'from-amber-500 to-yellow-500'
    : 'from-emerald-500 to-green-400';

  const timerText = realTimer.text;
  const timerUrgent = realTimer.urgent;
  const offerSlug = slugify(offer.name || 'offer');

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: Math.min(delay, 0.4), ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onClick={() => navigate(`/${offerSlug}`)}
      className="relative bg-card border border-border rounded-2xl flex flex-col h-full overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-primary/15 hover:border-primary/40 transition-shadow duration-300 contain-paint"
    >
      {/* Hover accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-blue-400/60 to-primary/20 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

      {/* Scarcity bar */}
      {showScarcityBar && (
        <div className="px-3 pt-2.5 pb-0">
          <div className="flex items-center justify-between mb-1 min-h-[14px]">
            {hasRealSlots ? (
              <span className={`text-[10px] font-black uppercase tracking-widest ${slotColor}`}>
                🔥 Only {slotsLeft}/{offer.totalSlots} slots left
              </span>
            ) : <span />}
            {hasTimer && timerText ? (
              <motion.span
                className={`text-[10px] font-black ml-auto ${timerUrgent ? 'text-red-400' : 'text-muted-foreground'}`}
                animate={timerUrgent ? { opacity: [1, 0.6, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}>
                ⏳ {timerText}
              </motion.span>
            ) : null}
          </div>
          {hasRealSlots && (
            <div className="h-1 bg-border/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${slotPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: delay + 0.3 }}
                className={`h-full rounded-full bg-gradient-to-r ${slotBarColor}`}
              />
            </div>
          )}
        </div>
      )}

      {/* Optional banner — lazy loaded with fallback */}
      {offer.bannerUrl && !bannerError && (
        <div className="h-20 overflow-hidden flex-shrink-0 relative mt-2 mx-3 rounded-xl bg-muted/30">
          <img
            src={offer.bannerUrl}
            alt={offer.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setBannerError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" />
        </div>
      )}

      <div className="p-4 flex flex-col h-full">
        {/* Badges */}
        {(isHot || isNewUser) && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {isHot && (
              <span className="inline-flex items-center gap-1 text-[10px] font-syne font-black px-2.5 py-1 rounded-full text-white bg-gradient-to-r from-orange-500 to-fire">
                🔥 HOT DEAL
              </span>
            )}
            {isNewUser && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary">
                NEW USERS ONLY
              </span>
            )}
          </div>
        )}

        {/* Identity */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <div className="w-[48px] h-[48px] rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-200 shadow-sm">
              {offer.logoUrl && !imgError ? (
                <img
                  src={offer.logoUrl}
                  alt={offer.name}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-xl"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-xs font-black text-primary leading-none select-none">
                  {(offer.name || 'OF').split(' ').slice(0, 2).map((w: string) => w?.[0] || '').join('').toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute -top-1.5 -right-1.5 flex items-center gap-0.5 bg-green-500 px-1.5 py-[3px] rounded-full shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
              <span className="text-white font-black leading-none" style={{ fontSize: 7 }}>LIVE</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="font-syne font-black text-sm text-foreground leading-snug line-clamp-2">{offer.name}</p>
            <span className="text-[10px] text-primary/80 font-bold mt-1 bg-primary/10 inline-block px-2 py-0.5 rounded-full border border-primary/15">
              {offer.category || 'Offer'}
            </span>
          </div>
        </div>

        {/* Payout */}
        <div className="rounded-xl px-4 py-2.5 mb-3 flex items-center justify-between border border-primary/20 bg-primary/5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">CASHBACK REWARD</p>
            <p className="font-syne font-black text-2xl text-gold leading-none">{(offer as any).payoutDisplay || `₹${offer.payout}`}</p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              <p className="text-[10px] font-bold text-green-400">WITHIN 24 HRS</p>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <p className="text-[10px] font-bold text-blue-400">UPI DIRECT</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex-1 space-y-1 mb-3">
          {tags.slice(0, 2).map(tag => (
            <div key={tag} className="flex items-start gap-2 text-xs font-medium">
              <span className="text-primary font-black flex-shrink-0 mt-px">✔</span>
              <span className="leading-snug text-muted-foreground">{tag}</span>
            </div>
          ))}
          {tags.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-primary font-black">✔</span>
              <span>Simple task to complete</span>
            </div>
          )}
        </div>

        {/* CTA — God-Mode controlled */}
        <div onClick={e => e.stopPropagation()}>
          <DynamicButton
            config={offerApplyConfig}
            noAlign
            className="w-full"
            onClick={() => navigate(`/${offerSlug}`)}
          />
        </div>
      </div>
    </motion.div>
  );
}

const OfferCard = memo(OfferCardInner);
export default OfferCard;
