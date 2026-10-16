import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getOfferByPrivateSlug } from 'zitejs/api';
import OfferPage from '@/components/OfferPage';
import OfferWarningPopup from '@/components/OfferWarningPopup';
import { useAppContext } from '@/contexts/AppContext';
import type { Offer, LeadFieldDef } from '@/types';
import { DEFAULT_LEAD_FIELDS } from '@/types';

export default function PrivateCampaignPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { settings } = useAppContext();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [leadFields, setLeadFields] = useState<LeadFieldDef[]>(DEFAULT_LEAD_FIELDS);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [warningConfirmed, setWarningConfirmed] = useState(false);

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

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    getOfferByPrivateSlug({ slug })
      .then(res => {
        if (!res.found || !res.offer) {
          setNotFound(true);
        } else {
          setOffer(res.offer as Offer);
          setWarningConfirmed(!(res.offer.warningPopupActive));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl animate-pulse">🔒</div>
          <p className="font-syne font-black text-muted-foreground text-sm">Loading exclusive offer…</p>
        </div>
      </div>
    );
  }

  if (notFound || !offer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="font-syne font-black text-2xl text-foreground mb-2">Campaign Not Found</h1>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            This exclusive campaign link is invalid or has expired.
            Please check your link and try again.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-syne font-black text-sm text-white bg-primary hover:opacity-90 transition-all"
          >
            ← Browse Public Offers
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Private Campaign badge — discreet indicator */}
      <div className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Exclusive Campaign</span>
        </motion.div>
      </div>

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
          offer={offer}
          leadFieldsConfig={leadFields}
          wifiWarningBannerUrl={wifiWarningBannerUrl}
          telegramLink={telegramLink}
          supportEmail={supportEmail}
          isPrivateLead={true}
          onClose={() => navigate('/')}
        />
      )}
    </>
  );
}
