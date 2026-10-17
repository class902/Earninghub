import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';

export default createEndpoint({
  description: 'Get referral tracker info for a referrer — shows their link stats and offer info',
  inputSchema: z.object({ code: z.string() }),
  outputSchema: z.object({
    valid: z.boolean(),
    reason: z.string().optional(),
    link: z.object({
      id: z.string(),
      referrerName: z.string(),
      offerName: z.string(),
      offerSlug: z.string(),
      referralCode: z.string(),
      linkStatus: z.string(),
      clickCount: z.number(),
      referrerSplit: z.string(),
      referrerUpi: z.string(),
      createdAt: z.string(),
      customReferrerData: z.string(),
    }).optional(),
    offer: z.object({
      name: z.string(),
      emoji: z.string(),
      payout: z.number(),
      logoUrl: z.string(),
      status: z.string(),
      expiresAt: z.string().optional(),
      referralEnabled: z.boolean(),
    }).optional(),
  }),
  execute: async ({ input }) => {
    const linkRecord = await db.referralLinks.findOne({ filters: { referralCode: input.code } });
    if (!linkRecord) return { valid: false, reason: 'Link not found' };

    const { records } = await db.offers.findAll({});
    const offer = records.find(r => {
      const slug = r.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '';
      return slug === linkRecord.offerSlug || r.name === linkRecord.offerName;
    });

    return {
      valid: true,
      link: {
        id: linkRecord.id,
        referrerName: linkRecord.referrerName || '',
        offerName: linkRecord.offerName || '',
        offerSlug: linkRecord.offerSlug || '',
        referralCode: linkRecord.referralCode || '',
        linkStatus: linkRecord.linkStatus || 'Active',
        clickCount: linkRecord.clickCount || 0,
        referrerSplit: linkRecord.referrerSplit || '50',
        referrerUpi: linkRecord.referrerUpi || '',
        createdAt: linkRecord.createdAt || '',
        customReferrerData: linkRecord.customReferrerData || '{}',
      },
      offer: offer ? {
        name: offer.name || '',
        emoji: offer.emoji || '🎯',
        payout: offer.payout || 0,
        logoUrl: offer.logoUrl || '',
        status: offer.status || 'Inactive',
        expiresAt: offer.expiresAt || undefined,
        referralEnabled: offer.referralEnabled ?? false,
      } : undefined,
    };
  },
});
