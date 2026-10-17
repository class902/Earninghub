import { useParams } from 'react-router-dom';
import ReferralLinkPage from './ReferralLinkPage';
import ReferralTrackerPage from './ReferralTrackerPage';
import OfferTrackPage from './OfferTrackPage';

/**
 * Handles two-segment dynamic routes:
 *  - /{offerSlug}.ref/{code}   → Referral link landing (redirect to offer)
 *  - /{offerSlug}.track/{code} → Referral tracker dashboard
 *  - /{slug}/user-lead-track   → User lead tracker
 */
export default function DynamicRefRouter() {
  const { segment1, segment2 } = useParams<{ segment1: string; segment2: string }>();

  if (!segment1 || !segment2) return null;

  // Check for .ref pattern → referral link landing
  if (segment1.endsWith('.ref')) {
    return <ReferralLinkPage overrideCode={segment2} />;
  }

  // Check for .track pattern → referral tracker
  if (segment1.endsWith('.track')) {
    return <ReferralTrackerPage overrideCode={segment2} />;
  }

  // Legacy: /:slug/user-lead-track
  if (segment2 === 'user-lead-track') {
    return <OfferTrackPage />;
  }

  return null;
}
