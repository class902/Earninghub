import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Zap } from 'lucide-react';
import OfferCard from './OfferCard';
import { useAppContext } from '@/contexts/AppContext';
import type { Offer } from '@/types';

const DEFAULT_CATEGORIES = ['All', 'Savings Account', 'Demat Account', 'Credit Card', 'Flash Deal'];

interface Props {
  offers: Offer[];
  loading: boolean;
  onSelectOffer: (offer: Offer) => void;
  topPadding?: boolean;
  heading?: string;
  subtitle?: string;
  badgeLiveNow?: string;
  badgeActive?: string;
  hideSearch?: boolean;
}

export default function OfferGrid({ offers, loading, onSelectOffer, topPadding, heading, subtitle, badgeLiveNow, badgeActive, hideSearch }: Props) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const { settings } = useAppContext();

  const gridCols = useMemo(() => {
    try {
      const lc = JSON.parse(settings?.layoutConfig || '{}');
      const cols = lc.offerColumns;
      if (cols === '2') return 'grid-cols-1 sm:grid-cols-2';
      if (cols === '4') return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    } catch {}
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  }, [settings?.layoutConfig]);

  // Dynamic categories from admin settings (falls back to defaults)
  const allCategoryList = useMemo(() => {
    try {
      const lc = JSON.parse(settings?.layoutConfig || '{}');
      if (Array.isArray(lc.offerCategories) && lc.offerCategories.length > 0) {
        return ['All', ...lc.offerCategories];
      }
    } catch {}
    return DEFAULT_CATEGORIES;
  }, [settings?.layoutConfig]);

  const availableCategories = useMemo(() => {
    const existing = new Set(offers.map(o => o.category).filter(Boolean));
    return allCategoryList.filter(c => c === 'All' || existing.has(c));
  }, [offers, allCategoryList]);

  const hotIds = useMemo(
    () => [...offers].sort((a, b) => b.payout - a.payout).slice(0, 3).map(o => o.id),
    [offers],
  );

  const filtered = useMemo(() => {
    let list = activeFilter === 'All' ? offers : offers.filter(o => o.category === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        o => o.name.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q) || o.category?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [offers, activeFilter, search]);

  return (
    <section id="offers" className={`relative z-10 px-5 md:px-[5%] pb-16 ${topPadding ? 'pt-20 md:pt-24' : 'pt-5 md:pt-6'}`}>
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">{badgeLiveNow || 'Live Now'}</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">{badgeActive || 'Active'}</span>
            </span>
          </div>
          <h2 className="font-syne font-black text-2xl md:text-3xl text-foreground">{heading || 'Active Cashback Offers'}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {subtitle || 'Pick an offer → complete the task → get cashback directly to your UPI'}
          </p>
        </div>
      </motion.div>

      {/* Category filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar"
      >
        <SlidersHorizontal size={14} className="text-muted-foreground flex-shrink-0 mr-1" />
        {availableCategories.map(cat => (
          <motion.button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            whileTap={{ scale: 0.95 }}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-syne font-black border transition-all ${
              activeFilter === cat
                ? 'bg-primary border-primary text-white shadow-md blue-glow-sm'
                : 'bg-card border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            {cat}
          </motion.button>
        ))}
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className={`grid ${gridCols} gap-5`}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 h-[260px]">
              {/* Badge placeholder */}
              <div className="flex gap-2">
                <div className="h-5 w-20 rounded-full skeleton-shimmer" />
              </div>
              {/* Identity row */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl skeleton-shimmer flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                  <div className="h-3 w-1/3 rounded-full skeleton-shimmer" />
                </div>
              </div>
              {/* Payout box */}
              <div className="h-16 rounded-xl skeleton-shimmer" />
              {/* Tags */}
              <div className="space-y-2 flex-1">
                <div className="h-3 w-2/3 rounded skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded skeleton-shimmer" />
              </div>
              {/* CTA */}
              <div className="h-11 rounded-xl skeleton-shimmer" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <div className="text-5xl mb-4">🔍</div>
          <p className="font-syne font-black text-xl text-foreground mb-2">No offers found</p>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            {search ? `Nothing matched "${search}" — try a different keyword.` : 'No offers in this category yet.'}
          </p>
          {(search || activeFilter !== 'All') && (
            <button onClick={() => { setSearch(''); setActiveFilter('All'); }}
              className="mt-5 px-5 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold text-sm hover:bg-primary/20 transition-all">
              Clear Filters
            </button>
          )}
        </motion.div>
      ) : (
        <>
          {/* Total count badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-5"
          >
            <Zap size={13} className="text-gold" />
            <span className="text-xs font-bold text-muted-foreground">{filtered.length} offer{filtered.length !== 1 ? 's' : ''} available</span>
          </motion.div>

          <div className={`grid ${gridCols} gap-5 items-start`}>
            {filtered.map((offer, i) => (
              <OfferCard key={offer.id} offer={offer} onSelect={onSelectOffer} delay={Math.min(i * 0.06, 0.5)} isHot={hotIds.includes(offer.id)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
