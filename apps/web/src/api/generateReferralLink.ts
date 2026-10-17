import { appUrl as getAppUrl } from '@server/context';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default createEndpoint({
  description: 'Generate a unique referral link for a specific offer with absolute ₹ amounts. Returns existing link if UPI already has one.',
  inputSchema: z.object({
    offerSlug: z.string(),
    offerName: z.string(),
    referrerName: z.string(),
    customReferrerData: z.string(),
    referrerSplit: z.string().optional().default('50'),
    referrerUpi: z.string().optional(),
    // ── CHANGES: Absolute ₹ amounts ──
    referrerCut: z.number().optional(),
    userCut: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    code: z.string(),
    link: z.string(),
    trackerLink: z.string(),
    id: z.string(),
    isExisting: z.boolean(),
    referrerCut: z.number(),
    userCut: z.number(),
  }),
  execute: async ({ input }) => {
    const { records } = await db.offers.findAll({});
    const offer = records.find(r => {
      const slug = r.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '';
      return slug === input.offerSlug || r.name?.toLowerCase() === input.offerName.toLowerCase();
    });

    if (!offer) throw new ApiError({ code: 'NOT_FOUND', message: 'Offer not found' });
    if (offer.status?.toLowerCase() !== 'active') throw new ApiError({ code: 'BAD_REQUEST', message: 'This offer is not currently active' });
    if (!offer.referralEnabled) throw new ApiError({ code: 'BAD_REQUEST', message: 'Referral program is not enabled for this offer' });

    // ── CHANGES: Calculate absolute amounts ──
    const adminCut = offer.referralAdminCut || 0;
    const offerPayout = offer.payout || 0;
    let referrerCutAmt = input.referrerCut ?? (offer.referralDefaultReferrerCut || 0);
    let userCutAmt = input.userCut ?? (offer.referralDefaultUserEstimate || 0);

    // Fallback: if no absolute amounts configured, use percentage split
    if (referrerCutAmt === 0 && userCutAmt === 0 && offerPayout > 0) {
      const splitPct = Number(input.referrerSplit) || 50;
      const distributable = offerPayout - adminCut;
      referrerCutAmt = Math.round((splitPct / 100) * distributable);
      userCutAmt = distributable - referrerCutAmt;
    }

    // Validate: referrerCut + userCut + adminCut should not exceed payout
    if (offerPayout > 0 && (referrerCutAmt + userCutAmt + adminCut) > offerPayout + 1) {
      throw new ApiError({ code: 'BAD_REQUEST', message: 'Split total exceeds offer payout' });
    }

    // Deduplication: one UPI = one link per offer
    if (input.referrerUpi && input.referrerUpi.trim()) {
      const upi = input.referrerUpi.trim().toLowerCase();
      const { records: upiLinks } = await db.referralLinks.findAll({ filters: { offerSlug: input.offerSlug }, limit: 500 });
      const existingByUpi = upiLinks.find(r => (r.referrerUpi || '').toLowerCase() === upi);
      if (existingByUpi) {
        const code = existingByUpi.referralCode || '';
        return {
          success: true,
          code,
          link: `${getAppUrl()}/${input.offerSlug}.ref/${code}`,
          trackerLink: `${getAppUrl()}/${input.offerSlug}.track/${code}`,
          id: existingByUpi.id,
          isExisting: true,
          referrerCut: existingByUpi.referrerCut || referrerCutAmt,
          userCut: existingByUpi.userCut || userCutAmt,
        };
      }
    }

    // Generate unique code
    let code = generateCode(8);
    for (let i = 0; i < 5; i++) {
      const existing = await db.referralLinks.findOne({ filters: { referralCode: code } });
      if (!existing) break;
      code = generateCode(8);
    }

    const record = await db.referralLinks.create({
      record: {
        referrerName: input.referrerName,
        offerName: input.offerName,
        offerSlug: input.offerSlug,
        referralCode: code,
        customReferrerData: input.customReferrerData,
        linkStatus: 'Active',
        clickCount: 0,
        referrerSplit: input.referrerSplit,
        referrerUpi: input.referrerUpi?.trim() || '',
        // ── CHANGES: Store absolute amounts ──
        offerId: offer.id,
        referrerCut: referrerCutAmt,
        userCut: userCutAmt,
      },
    });

    return {
      success: true,
      code,
      link: `${getAppUrl()}/${input.offerSlug}.ref/${code}`,
      trackerLink: `${getAppUrl()}/${input.offerSlug}.track/${code}`,
      id: record.id,
      isExisting: false,
      referrerCut: referrerCutAmt,
      userCut: userCutAmt,
    };
  },
});
