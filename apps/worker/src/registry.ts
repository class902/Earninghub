// Generated list of API endpoints (one file per endpoint in apps/web/src/api).
// Run `node scripts/gen-registry.mjs` after adding or removing an endpoint.
import type { EndpointConfig } from './runtime/backend';

import adminAddReferralRemark from '../../web/src/api/adminAddReferralRemark';
import adminCreateBackup from '../../web/src/api/adminCreateBackup';
import adminCreateLead from '../../web/src/api/adminCreateLead';
import adminCreateReferralLink from '../../web/src/api/adminCreateReferralLink';
import adminDeleteBackup from '../../web/src/api/adminDeleteBackup';
import adminDeleteCashbackForm from '../../web/src/api/adminDeleteCashbackForm';
import adminDeleteLead from '../../web/src/api/adminDeleteLead';
import adminDeleteOffer from '../../web/src/api/adminDeleteOffer';
import adminDeletePoster from '../../web/src/api/adminDeletePoster';
import adminExportReferrals from '../../web/src/api/adminExportReferrals';
import adminExtendLinkExpiry from '../../web/src/api/adminExtendLinkExpiry';
import adminFactoryReset from '../../web/src/api/adminFactoryReset';
import adminGetAffiliateMetrics from '../../web/src/api/adminGetAffiliateMetrics';
import adminGetBackupData from '../../web/src/api/adminGetBackupData';
import adminGetBackups from '../../web/src/api/adminGetBackups';
import adminGetCashbackForms from '../../web/src/api/adminGetCashbackForms';
import adminGetCashbackSubmissions from '../../web/src/api/adminGetCashbackSubmissions';
import adminGetLeads from '../../web/src/api/adminGetLeads';
import adminGetLinkDetail from '../../web/src/api/adminGetLinkDetail';
import adminGetLinksV2 from '../../web/src/api/adminGetLinksV2';
import adminGetOfferReferralPerformance from '../../web/src/api/adminGetOfferReferralPerformance';
import adminGetOffers from '../../web/src/api/adminGetOffers';
import adminGetPosters from '../../web/src/api/adminGetPosters';
import adminGetReferralDashboard from '../../web/src/api/adminGetReferralDashboard';
import adminGetReferralDetail from '../../web/src/api/adminGetReferralDetail';
import adminGetReferralLinks from '../../web/src/api/adminGetReferralLinks';
import adminGetReferralRecords from '../../web/src/api/adminGetReferralRecords';
import adminGetReferrals from '../../web/src/api/adminGetReferrals';
import adminGetReferrerPerformance from '../../web/src/api/adminGetReferrerPerformance';
import adminGetTrash from '../../web/src/api/adminGetTrash';
import adminLogin from '../../web/src/api/adminLogin';
import adminPermanentDelete from '../../web/src/api/adminPermanentDelete';
import adminReorderOffer from '../../web/src/api/adminReorderOffer';
import adminRestoreBackup from '../../web/src/api/adminRestoreBackup';
import adminRestoreItem from '../../web/src/api/adminRestoreItem';
import adminSaveCashbackForm from '../../web/src/api/adminSaveCashbackForm';
import adminSaveOffer from '../../web/src/api/adminSaveOffer';
import adminSavePoster from '../../web/src/api/adminSavePoster';
import adminSaveSettings from '../../web/src/api/adminSaveSettings';
import adminSendOtp from '../../web/src/api/adminSendOtp';
import adminUpdateLead from '../../web/src/api/adminUpdateLead';
import adminUpdateLinkStatus from '../../web/src/api/adminUpdateLinkStatus';
import adminUpdateReferral from '../../web/src/api/adminUpdateReferral';
import adminUpdateReferralLink from '../../web/src/api/adminUpdateReferralLink';
import adminUpdateReferralStatus from '../../web/src/api/adminUpdateReferralStatus';
import adminVerifyOtpChangeCredentials from '../../web/src/api/adminVerifyOtpChangeCredentials';
import adminVerifySession from '../../web/src/api/adminVerifySession';
import checkLinkHealth from '../../web/src/api/checkLinkHealth';
import generateReferralLink from '../../web/src/api/generateReferralLink';
import getCashbackForms from '../../web/src/api/getCashbackForms';
import getFormBySlug from '../../web/src/api/getFormBySlug';
import getMyReferralLinks from '../../web/src/api/getMyReferralLinks';
import getOfferByPrivateSlug from '../../web/src/api/getOfferByPrivateSlug';
import getOffers from '../../web/src/api/getOffers';
import getPosters from '../../web/src/api/getPosters';
import getReferralLeads from '../../web/src/api/getReferralLeads';
import getReferralLinkInfo from '../../web/src/api/getReferralLinkInfo';
import getReferralOffers from '../../web/src/api/getReferralOffers';
import getReferralTrackerInfo from '../../web/src/api/getReferralTrackerInfo';
import getSettings from '../../web/src/api/getSettings';
import recordActionClick from '../../web/src/api/recordActionClick';
import searchLeadsByUpi from '../../web/src/api/searchLeadsByUpi';
import submitCashbackForm from '../../web/src/api/submitCashbackForm';
import submitLead from '../../web/src/api/submitLead';
import trackEvent from '../../web/src/api/trackEvent';
import trackOfferComplete from '../../web/src/api/trackOfferComplete';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ENDPOINTS: Record<string, EndpointConfig<any, any, any>> = {
  adminAddReferralRemark,
  adminCreateBackup,
  adminCreateLead,
  adminCreateReferralLink,
  adminDeleteBackup,
  adminDeleteCashbackForm,
  adminDeleteLead,
  adminDeleteOffer,
  adminDeletePoster,
  adminExportReferrals,
  adminExtendLinkExpiry,
  adminFactoryReset,
  adminGetAffiliateMetrics,
  adminGetBackupData,
  adminGetBackups,
  adminGetCashbackForms,
  adminGetCashbackSubmissions,
  adminGetLeads,
  adminGetLinkDetail,
  adminGetLinksV2,
  adminGetOfferReferralPerformance,
  adminGetOffers,
  adminGetPosters,
  adminGetReferralDashboard,
  adminGetReferralDetail,
  adminGetReferralLinks,
  adminGetReferralRecords,
  adminGetReferrals,
  adminGetReferrerPerformance,
  adminGetTrash,
  adminLogin,
  adminPermanentDelete,
  adminReorderOffer,
  adminRestoreBackup,
  adminRestoreItem,
  adminSaveCashbackForm,
  adminSaveOffer,
  adminSavePoster,
  adminSaveSettings,
  adminSendOtp,
  adminUpdateLead,
  adminUpdateLinkStatus,
  adminUpdateReferral,
  adminUpdateReferralLink,
  adminUpdateReferralStatus,
  adminVerifyOtpChangeCredentials,
  adminVerifySession,
  checkLinkHealth,
  generateReferralLink,
  getCashbackForms,
  getFormBySlug,
  getMyReferralLinks,
  getOfferByPrivateSlug,
  getOffers,
  getPosters,
  getReferralLeads,
  getReferralLinkInfo,
  getReferralOffers,
  getReferralTrackerInfo,
  getSettings,
  recordActionClick,
  searchLeadsByUpi,
  submitCashbackForm,
  submitLead,
  trackEvent,
  trackOfferComplete,
};
