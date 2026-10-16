import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getOffers } from 'zitejs/api';
import OfferPage from '@/components/OfferPage';
import OfferWarningPopup from '@/components/OfferWarningPopup';
import { findOfferBySlug } from '@/utils/slugify';
import { useAppContext } from '@/contexts/AppContext';
import type { Offer, LeadFieldDef } from '@/types';
import { DEFAULT_LEAD_FIELDS } from '@/types';

// ── CHANGES: Read referral cookie ──
function getReferralCookie(): string {
  const match = document.cookie.match(/(?:^|;\s*)eh_ref_code=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export default function OfferSlugPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { settings } = useAppContext();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [leadFields, setLeadFields] = useState<LeadFieldDef[]>(DEFAULT_LEAD_FIELDS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [warningConfirmed, setWarningConfirmed] = useState(false);
  // ── CHANGES: Referral state ──
  const [referralUserCut, setReferralUserCut] = useState<number | null>(null);
  const [referralCode, setReferralCode] = useState('');

  const wifiWarningBannerUrl = settings?.wifiWarningBannerUrl || '';
  const telegramLink = settings?.telegramLink || '';
  const supportEmail = settings?.supportEmail || '';

  useEffect(() => { window.scrollTo({ top: 0 }); }, []);

  useEffect(() => {
    if (settings?.leadFieldsConfig) {
      try {
        const parsed = JSON.parse(settings.leadFieldsConfig) as LeadFieldDef[];
        if (Array.isArray(parsed) && parsed.length > 0) setLeadFields(parsed);
      } catch {}
    }
  }, [settings]);

  // ── CHANGES: Check for referral code from URL param, cookie, or sessionStorage ──
  useEffect(() => {
    const refFromUrl = searchParams.get('ref') || '';
    const refFromCookie = getReferralCookie();
    const refFromSession = sessionStorage.getItem('eh_ref_code') || '';
    const code = refFromUrl || refFromCookie || refFromSession;
    if (code) {
      setReferralCode(code);
      // Try to get userCut from sessionStorage (set by ReferralLinkPage)
      const userCutStr = sessionStorage.getItem('eh_ref_user_cut');
      if (userCutStr) {
        const cut = Number(userCutStr);
        if (cut > 0) setReferralUserCut(cut);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    getOffers({}).catch(() => ({ offers: [] as Offer[] })).then((o: { offers: Offer[] }) => {
      setOffers(o.offers);
      const found = findOfferBySlug(o.offers, slug!);
      if (!found) setNotFound(true);
      else setWarningConfirmed(!found.warningPopupActive);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl animate-pulse">💰</div>
          <p className="font-syne font-black text-muted-foreground text-sm">Loading offer…</p>
        </div>
      </div>
    );
  }

  let offer = findOfferBySlug(offers, slug!);

  if (notFound || !offer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="text-6xl mb-6">🔍</div>
          <h1 className="font-syne font-black text-2xl text-foreground mb-2">Offer Not Found</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            The offer <strong className="text-foreground">/{slug}</strong> doesn't exist or may have been removed.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-syne font-black text-sm text-white"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #60a5fa 100%)' }}
          >
            ← Browse All Offers
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── CHANGES: Override payout with referral userCut if available ──
  const displayOffer = referralUserCut && referralUserCut > 0
    ? { ...offer, payout: referralUserCut }
    : offer;

  return (
    <>
      {/* Warning popup gate */}
      <AnimatePresence>
        {!warningConfirmed && (
          <OfferWarningPopup
            key="warning"
            offer={offer}
            onConfirm={() => setWarningConfirmed(true)}
            onClose={() => navigate('/')}
          />
        )}
      </AnimatePresence>

      {warningConfirmed && (
          <OfferPage
            offer={displayOffer}
            leadFieldsConfig={leadFields}
            wifiWarningBannerUrl={wifiWarningBannerUrl}
            telegramLink={telegramLink}
            supportEmail={supportEmail}
            onClose={() => navigate('/')}
            referralCode={referralCode}
          />
      )}
    </>
  );
}
