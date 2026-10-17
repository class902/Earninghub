// Database schema for the EarningHub API (Cloudflare D1 / SQLite).
// Source of truth for table + column definitions. Keep in sync with migrations/.

export type FieldKind = 'text' | 'number' | 'boolean' | 'json';
export type FieldRole = 'createdAt' | 'updatedAt' | 'autonumber';
export interface FieldDef { name: string; kind: FieldKind; role?: FieldRole }
export interface TableDef { sdk: string; key: string; fields: FieldDef[] }

export const TABLES: TableDef[] = [
  {
    sdk: 'Offers',
    key: 'offers',
    fields: [
      { name: 'name', kind: 'text' },
      { name: 'emoji', kind: 'text' },
      { name: 'description', kind: 'text' },
      { name: 'steps', kind: 'text' },
      { name: 'payout', kind: 'number' },
      { name: 'category', kind: 'text' },
      { name: 'tags', kind: 'text' },
      { name: 'redirectLink', kind: 'text' },
      { name: 'status', kind: 'text' },
      { name: 'fieldsConfig', kind: 'text' },
      { name: 'formEnabled', kind: 'boolean' },
      { name: 'formConfig', kind: 'text' },
      { name: 'logoUrl', kind: 'text' },
      { name: 'bannerUrl', kind: 'text' },
      { name: 'warningPopupImage', kind: 'text' },
      { name: 'warningPopupActive', kind: 'boolean' },
      { name: 'leadConfigEnabled', kind: 'boolean' },
      { name: 'termsAndConditions', kind: 'text' },
      { name: 'sortRank', kind: 'number' },
      { name: 'expiresAt', kind: 'text' },
      { name: 'totalSlots', kind: 'number' },
      { name: 'filledSlots', kind: 'number' },
      { name: 'sampleScreenshotUrl', kind: 'text' },
      { name: 'isPrivate', kind: 'boolean' },
      { name: 'privateSlug', kind: 'text' },
      { name: 'referrerFormConfig', kind: 'text' },
      { name: 'referralEnabled', kind: 'boolean' },
      { name: 'referralAdminCut', kind: 'number' },
      { name: 'referralDefaultReferrerCut', kind: 'number' },
      { name: 'referralDefaultUserEstimate', kind: 'number' },
      { name: 'payoutDisplay', kind: 'text' },
      { name: 'userPayout', kind: 'number' },
      { name: 'adminPayout', kind: 'number' },
    ],
  },
  {
    sdk: 'Leads',
    key: 'leads',
    fields: [
      { name: 'summary', kind: 'text' },
      { name: 'offerName', kind: 'text' },
      { name: 'offerPayout', kind: 'number' },
      { name: 'leadData', kind: 'text' },
      { name: 'status', kind: 'text' },
      { name: 'createdAt', kind: 'text', role: 'createdAt' },
      { name: 'leadId', kind: 'text' },
      { name: 'publicRemark', kind: 'text' },
      { name: 'internalNote', kind: 'text' },
      { name: 'actionConfig', kind: 'text' },
      { name: 'referralCode', kind: 'text' },
      { name: 'isReferralLead', kind: 'boolean' },
      { name: 'referralLinkId', kind: 'text' },
      { name: 'updatedAt', kind: 'text', role: 'updatedAt' },
      { name: 'createdByType', kind: 'text' },
    ],
  },
  {
    sdk: 'Posters',
    key: 'posters',
    fields: [
      { name: 'title', kind: 'text' },
      { name: 'imageUrl', kind: 'text' },
      { name: 'isActive', kind: 'boolean' },
      { name: 'displayOrder', kind: 'number' },
      { name: 'createdAt', kind: 'text', role: 'createdAt' },
    ],
  },
  {
    sdk: 'CashbackForms',
    key: 'cashbackForms',
    fields: [
      { name: 'formTitle', kind: 'text' },
      { name: 'description', kind: 'text' },
      { name: 'isActive', kind: 'boolean' },
      { name: 'fieldsConfig', kind: 'text' },
      { name: 'createdAt', kind: 'text', role: 'createdAt' },
      { name: 'logoUrl', kind: 'text' },
      { name: 'bannerUrl', kind: 'text' },
      { name: 'sampleScreenshotUrl', kind: 'text' },
      { name: 'slug', kind: 'text' },
      { name: 'isPublic', kind: 'boolean' },
      { name: 'partnerLink', kind: 'text' },
      { name: 'isEmbed', kind: 'boolean' },
    ],
  },
  {
    sdk: 'CashbackSubmissions',
    key: 'cashbackSubmissions',
    fields: [
      { name: 'referenceId', kind: 'text' },
      { name: 'formTitle', kind: 'text' },
      { name: 'submissionData', kind: 'text' },
      { name: 'submittedAt', kind: 'text', role: 'createdAt' },
    ],
  },
  {
    sdk: 'Referrals',
    key: 'referrals',
    fields: [
      { name: 'referrerUpi', kind: 'text' },
      { name: 'referredUpi', kind: 'text' },
      { name: 'offerName', kind: 'text' },
      { name: 'bonusPaid', kind: 'boolean' },
      { name: 'createdAt', kind: 'text', role: 'createdAt' },
    ],
  },
  {
    sdk: 'AppBackups',
    key: 'appBackups',
    fields: [
      { name: 'label', kind: 'text' },
      { name: 'data', kind: 'text' },
      { name: 'source', kind: 'text' },
      { name: 'summary', kind: 'text' },
      { name: 'createdAt', kind: 'text', role: 'createdAt' },
    ],
  },
  {
    sdk: 'ReferralLinks',
    key: 'referralLinks',
    fields: [
      { name: 'referrerName', kind: 'text' },
      { name: 'offerName', kind: 'text' },
      { name: 'offerSlug', kind: 'text' },
      { name: 'referralCode', kind: 'text' },
      { name: 'customReferrerData', kind: 'text' },
      { name: 'linkStatus', kind: 'text' },
      { name: 'clickCount', kind: 'number' },
      { name: 'referrerSplit', kind: 'text' },
      { name: 'createdAt', kind: 'text', role: 'createdAt' },
      { name: 'referrerUpi', kind: 'text' },
      { name: 'leadCount', kind: 'number' },
      { name: 'offerId', kind: 'text' },
      { name: 'referrerCut', kind: 'number' },
      { name: 'userCut', kind: 'number' },
      { name: 'createdByType', kind: 'text' },
      { name: 'expiryDate', kind: 'text' },
      { name: 'referralLimit', kind: 'number' },
      { name: 'uniqueClickCount', kind: 'number' },
      { name: 'pausedAt', kind: 'text' },
      { name: 'pausedBy', kind: 'text' },
      { name: 'pauseReason', kind: 'text' },
      { name: 'terminatedAt', kind: 'text' },
      { name: 'terminatedBy', kind: 'text' },
      { name: 'terminateReason', kind: 'text' },
      { name: 'revokedAt', kind: 'text' },
      { name: 'revokedBy', kind: 'text' },
      { name: 'revokeReason', kind: 'text' },
      { name: 'internalNote', kind: 'text' },
      { name: 'lastActivityAt', kind: 'text' },
      { name: 'resumedAt', kind: 'text' },
    ],
  },
  {
    sdk: 'ReferralLeads',
    key: 'referralLeads',
    fields: [
      { name: 'referralId', kind: 'number', role: 'autonumber' },
      { name: 'referredUserName', kind: 'text' },
      { name: 'referredUserIdentifier', kind: 'text' },
      { name: 'referrerName', kind: 'text' },
      { name: 'referrerUpi', kind: 'text' },
      { name: 'offerName', kind: 'text' },
      { name: 'offerId', kind: 'text' },
      { name: 'leadId', kind: 'text' },
      { name: 'referralLinkId', kind: 'text' },
      { name: 'referralCode', kind: 'text' },
      { name: 'leadStatus', kind: 'text' },
      { name: 'cashbackStatus', kind: 'text' },
      { name: 'cashbackAmount', kind: 'number' },
      { name: 'rewardStatus', kind: 'text' },
      { name: 'rewardAmount', kind: 'number' },
      { name: 'paymentStatus', kind: 'text' },
      { name: 'publicRemark', kind: 'text' },
      { name: 'internalNote', kind: 'text' },
      { name: 'qualifiedAt', kind: 'text' },
      { name: 'cashbackPaidAt', kind: 'text' },
      { name: 'rewardPaidAt', kind: 'text' },
      { name: 'rejectionReason', kind: 'text' },
      { name: 'source', kind: 'text' },
      { name: 'createdByType', kind: 'text' },
      { name: 'flaggedForReview', kind: 'boolean' },
      { name: 'flagReason', kind: 'text' },
      { name: 'createdAt', kind: 'text', role: 'createdAt' },
      { name: 'updatedAt', kind: 'text', role: 'updatedAt' },
    ],
  },
  {
    sdk: 'ReferralAuditLog',
    key: 'referralAuditLog',
    fields: [
      { name: 'eventId', kind: 'number', role: 'autonumber' },
      { name: 'entityType', kind: 'text' },
      { name: 'entityId', kind: 'text' },
      { name: 'action', kind: 'text' },
      { name: 'actor', kind: 'text' },
      { name: 'previousValue', kind: 'text' },
      { name: 'newValue', kind: 'text' },
      { name: 'reason', kind: 'text' },
      { name: 'note', kind: 'text' },
      { name: 'createdAt', kind: 'text', role: 'createdAt' },
    ],
  },
];

/** Secondary indexes: table -> columns (only existing columns are indexed). */
export const INDEXES: Record<string, string[]> = {
  "Offers": [
    "status",
    "privateSlug",
    "category"
  ],
  "CashbackForms": [
    "slug"
  ],
  "AppBackups": [
    "label"
  ],
  "ReferralLinks": [
    "referralCode",
    "linkStatus",
    "referrerUpi"
  ],
  "ReferralLeads": [
    "referralCode",
    "referrerUpi",
    "leadStatus"
  ],
  "ReferralAuditLog": [
    "entityId"
  ],
  "Leads": [
    "offerName",
    "status",
    "upiId"
  ],
  "Referrals": [
    "referrerUpi"
  ]
};
