import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getOffers, getPosters, getCashbackForms } from '@/lib/api';
import type { GetCashbackFormsOutputType } from '@/lib/api';
import NavBar from '@/components/NavBar';
import HeroSection from '@/components/HeroSection';
import Ticker from '@/components/Ticker';
import HomeBanner from '@/components/HomeBanner';
import OfferGrid from '@/components/OfferGrid';
import PromoPopup from '@/components/PromoPopup';
import type { PromoConfig } from '@/components/PromoPopup';
import UnifiedCashbackForm from '@/components/UnifiedCashbackForm';
import ReferSection from '@/components/ReferSection';
import SiteFooter from '@/components/SiteFooter';
import PayoutTicker from '@/components/PayoutTicker';
import { useAppContext } from '@/contexts/AppContext';
import type { Offer, Poster, CashbackForm, CashbackFormField } from '@/types';
import { slugify } from '@/utils/slugify';
import PageTransition from '@/components/PageTransition';


type RawForm = GetCashbackFormsOutputType['forms'][0];

function parseRawForm(r: RawForm): CashbackForm {
  let fields: CashbackFormField[] = [];
  try { fields = JSON.parse(r.fields); } catch {}
  return {
    id: r.id, title: r.title, description: r.description,
    isActive: true, fields, logoUrl: r.logoUrl, bannerUrl: r.bannerUrl, sampleScreenshotUrl: r.sampleScreenshotUrl || '',
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, settingsLoaded } = useAppContext();
  const [offers, setOffers] = useState<Offer[]>([]);

  // Store referrer UPI from ?ref= URL param in sessionStorage
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && ref.trim()) {
      sessionStorage.setItem('eh_referrer', ref.trim());
    }
  }, []);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [cashbackForms, setCashbackForms] = useState<CashbackForm[]>([]);
  const [loading, setLoading] = useState(true);

  // Build promo config from AppContext settings (no redundant getSettings call)
  const promoConfig: PromoConfig = {
    enabled: settings?.promoEnabled || false,
    bannerUrl: settings?.promoBannerUrl || '',
    title: settings?.promoTitle || '',
    subtitle: settings?.promoSubtitle || '',
    buttonText: settings?.promoButtonText || 'Claim Now →',
    offerLink: settings?.promoOfferLink || '',
    redirectLink: settings?.promoRedirectLink || '',
    cashbackFormEnabled: settings?.promoCashbackFormEnabled || false,
    delay: settings?.promoDelay ?? 3,
    autoClose: settings?.promoAutoClose ?? 0,
  };

  const telegramLink = settings?.telegramLink || '';
  const supportEmail = settings?.supportEmail || '';

  // Layout config — prefer God-Mode UI config, fall back to legacy settings
  const uiHero = settings?.uiHero;
  const uiTicker = settings?.uiTicker;
  const uiOfferGrid = settings?.uiOfferGrid;

  // Legacy fallback
  const layoutConfig = (() => { try { return JSON.parse(settings?.layoutConfig || '{}'); } catch { return {}; } })();
  const showHero = uiHero?.show ?? layoutConfig.showHero !== false;
  const showTicker = uiTicker?.show ?? layoutConfig.showTicker !== false;
  const tickerLabel = uiTicker?.label || '';
  const tickerCustomText = uiTicker?.customText || settings?.tickerText || '';

  useEffect(() => {
    Promise.all([
      getOffers({}).catch(() => ({ offers: [] as Offer[] })),
      getPosters({}).catch(() => ({ posters: [] as Poster[] })),
      getCashbackForms({}).catch(() => ({ forms: [] as RawForm[] })),
    ]).then(([o, p, c]) => {
      setOffers(o.offers);
      setPosters(p.posters as Poster[]);
      setCashbackForms(c.forms.map(parseRawForm));
      setLoading(false);
    });
  }, []);

  function handleSelectOffer(offer: Offer) {
    navigate(`/${slugify(offer.name)}`);
  }

  // ── Gate render on config resolution to prevent config flicker ──
  if (!settingsLoaded) {
    return (
      <div className="min-h-screen bg-background font-satoshi">
        {/* Navbar skeleton */}
        <div className="h-14 bg-card/80 border-b border-border animate-pulse" />
        {/* Hero skeleton */}
        <div className="pt-20 pb-8 px-5 text-center space-y-4">
          <div className="h-5 w-40 mx-auto rounded-full skeleton-shimmer" />
          <div className="h-10 w-72 mx-auto rounded skeleton-shimmer" />
          <div className="h-4 w-60 mx-auto rounded skeleton-shimmer" />
          <div className="flex justify-center gap-3 pt-2">
            <div className="h-11 w-36 rounded-2xl skeleton-shimmer" />
            <div className="h-11 w-36 rounded-2xl skeleton-shimmer" />
          </div>
        </div>
        {/* Offer section skeleton */}
        <div className="px-5 pt-6 space-y-4">
          <div className="h-6 w-48 rounded skeleton-shimmer" />
          <div className="h-10 w-full rounded-xl skeleton-shimmer" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3 h-64">
                <div className="h-4 w-20 rounded-full skeleton-shimmer" />
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl skeleton-shimmer flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded skeleton-shimmer" />
                    <div className="h-3 w-1/3 rounded-full skeleton-shimmer" />
                  </div>
                </div>
                <div className="h-14 rounded-xl skeleton-shimmer" />
                <div className="h-11 rounded-xl skeleton-shimmer mt-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background font-satoshi">
      <NavBar />
      {showHero && <HeroSection />}
      {/* Spacer when hero is hidden so ticker doesn't go under the fixed navbar */}
      {!showHero && <div className="pt-16" />}

      {/* Announcements Ticker — positioned just above Active Cashback Offers */}
      {showTicker && (
        <Ticker offers={offers} customText={tickerCustomText} tickerLabel={tickerLabel} />
      )}

      {settings?.uiActiveOffers?.show !== false && (
        <OfferGrid
          offers={offers}
          loading={loading}
          onSelectOffer={handleSelectOffer}
          heading={settings?.uiActiveOffers?.heading}
          subtitle={settings?.uiActiveOffers?.subtitle}
          badgeLiveNow={settings?.uiActiveOffers?.badgeLiveNow}
          badgeActive={settings?.uiActiveOffers?.badgeActive}
          hideSearch
        />
      )}
      <HomeBanner posters={posters} />
      <UnifiedCashbackForm forms={cashbackForms} />
      {settings?.referralEnabled && <ReferSection />}
      <SiteFooter />

      {/* Track Lead FAB — bottom-left */}
      <Link
        to="/user-lead-track"
        className="fixed bottom-6 left-5 z-40 flex items-center gap-2 font-syne font-black text-sm text-primary-foreground bg-primary hover:-translate-y-1 active:scale-95 transition-all duration-200 px-[18px] py-[11px] rounded-full shadow-lg shadow-primary/40 ring-1 ring-primary/20"
        style={{ paddingBottom: 'calc(11px + env(safe-area-inset-bottom, 0px))' }}
      >
        <span className="text-base">🔍</span>
        <span className="hidden sm:inline">Track Lead</span>
      </Link>

      {/* Promotional Popup */}
      <PromoPopup config={promoConfig} offers={offers} onSelectOffer={handleSelectOffer} />

      {/* Live Payout Ticker */}
      <PayoutTicker offerPayouts={offers.filter(o => o.status === 'Active').map(o => ({ name: o.name, payout: o.payout }))} />
    </PageTransition>
  );
}
