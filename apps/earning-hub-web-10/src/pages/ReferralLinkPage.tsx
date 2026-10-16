import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReferralLinkInfo, GetReferralLinkInfoOutputType } from 'zitejs/api';
import ExpiredOfferFallback from '@/components/ExpiredOfferFallback';

type LinkInfo = GetReferralLinkInfoOutputType;

interface Props {
  overrideCode?: string;
}

// ── CHANGES: Set cookie instead of sessionStorage ──
function setReferralCookie(code: string) {
  const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  document.cookie = `eh_ref_code=${encodeURIComponent(code)};path=/;max-age=${maxAge};SameSite=Lax`;
}

export default function ReferralLinkPage({ overrideCode }: Props = {}) {
  const { code: routeCode } = useParams<{ code: string }>();
  const code = overrideCode || routeCode;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<LinkInfo | null>(null);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    getReferralLinkInfo({ code })
      .then(data => setInfo(data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [code]);

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

  if (!info && !loading) {
    return <ExpiredOfferFallback reason="This link doesn't exist or may have been removed." />;
  }

  if (info && (!info.valid || info.expired)) {
    return <ExpiredOfferFallback offerName={info.offer?.name || info.link?.offerName} reason={info.reason} />;
  }

  if (info?.valid && info.offer) {
    const offerSlug = info.link?.offerSlug || info.offer.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    // ── CHANGES: Set cookie + sessionStorage for backward compat ──
    try {
      setReferralCookie(code || '');
      sessionStorage.setItem('eh_ref_code', code || '');
      sessionStorage.setItem('eh_ref_offer', info.offer.name);
      sessionStorage.setItem('eh_ref_name', info.link?.referrerName || '');
      // Store userCut so offer page can show modified payout
      if (info.link?.userCut) {
        sessionStorage.setItem('eh_ref_user_cut', String(info.link.userCut));
      }
    } catch {}
    navigate(`/${offerSlug}?ref=${code}`, { replace: true });
    return null;
  }

  return <ExpiredOfferFallback reason="Something went wrong loading this offer." />;
}
