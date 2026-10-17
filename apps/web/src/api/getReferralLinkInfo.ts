import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';

export default createEndpoint({
  description: 'Get info about a referral link — checks if offer is valid, active, and link is not revoked',
  inputSchema: z.object({
    code: z.string(),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    expired: z.boolean(),
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
      referrerCut: z.number(),
      userCut: z.number(),
      createdAt: z.string(),
    }).optional(),
    offer: z.object({
      id: z.string(),
      name: z.string(),
      emoji: z.string(),
      description: z.string(),
      payout: z.number(),
      status: z.string(),
      logoUrl: z.string(),
      bannerUrl: z.string(),
      redirectLink: z.string(),
      expiresAt: z.string().optional(),
      referralEnabled: z.boolean(),
    }).optional(),
  }),
  execute: async ({ input }) => {
    // Find the referral link record
    const linkRecord = await db.referralLinks.findOne({ filters: { referralCode: input.code } });

    if (!linkRecord) {
      return { valid: false, expired: false, reason: 'Link not found' };
    }

    if (linkRecord.linkStatus === 'Revoked') {
      return {
        valid: false,
        expired: false,
        reason: 'This referral link has been revoked',
        link: {
          id: linkRecord.id,
          referrerName: linkRecord.referrerName || '',
          offerName: linkRecord.offerName || '',
          offerSlug: linkRecord.offerSlug || '',
          referralCode: linkRecord.referralCode || '',
          linkStatus: linkRecord.linkStatus || 'Active',
          clickCount: linkRecord.clickCount || 0,
          referrerSplit: linkRecord.referrerSplit || '50',
          referrerCut: linkRecord.referrerCut || 0,
          userCut: linkRecord.userCut || 0,
          createdAt: linkRecord.createdAt || '',
        },
      };
    }

    // Increment click count (fire-and-forget)
    db.referralLinks.update({
      id: linkRecord.id,
      record: { clickCount: (linkRecord.clickCount || 0) + 1 },
    }).catch(() => {});

    // Find the associated offer
    const { records } = await db.offers.findAll({});
    const offer = records.find(r => {
      const slug = r.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '';
      return slug === linkRecord.offerSlug || r.name === linkRecord.offerName;
    });

    if (!offer) {
      return {
        valid: false,
        expired: true,
        reason: 'The offer associated with this link no longer exists',
        link: {
          id: linkRecord.id,
          referrerName: linkRecord.referrerName || '',
          offerName: linkRecord.offerName || '',
          offerSlug: linkRecord.offerSlug || '',
          referralCode: linkRecord.referralCode || '',
          linkStatus: linkRecord.linkStatus || 'Active',
          clickCount: linkRecord.clickCount || 0,
          referrerSplit: linkRecord.referrerSplit || '50',
          referrerCut: linkRecord.referrerCut || 0,
          userCut: linkRecord.userCut || 0,
          createdAt: linkRecord.createdAt || '',
        },
      };
    }

    const isExpired = offer.expiresAt ? new Date(offer.expiresAt) < new Date() : false;
    const isInactive = offer.status?.toLowerCase() !== 'active';
    const referralDisabled = !offer.referralEnabled;

    const offerPayload = {
      id: offer.id,
      name: offer.name || '',
      emoji: offer.emoji || '🎯',
      description: offer.description || '',
      payout: offer.payout || 0,
      status: offer.status || 'Inactive',
      logoUrl: offer.logoUrl || '',
      bannerUrl: offer.bannerUrl || '',
      redirectLink: offer.redirectLink || '',
      expiresAt: offer.expiresAt || undefined,
      referralEnabled: offer.referralEnabled ?? false,
    };

    const linkPayload = {
      id: linkRecord.id,
      referrerName: linkRecord.referrerName || '',
      offerName: linkRecord.offerName || '',
      offerSlug: linkRecord.offerSlug || '',
      referralCode: linkRecord.referralCode || '',
      linkStatus: linkRecord.linkStatus || 'Active',
      clickCount: linkRecord.clickCount || 0,
      referrerSplit: linkRecord.referrerSplit || '50',
      referrerCut: linkRecord.referrerCut || 0,
      userCut: linkRecord.userCut || 0,
      createdAt: linkRecord.createdAt || '',
    };

    if (isExpired) {
      return { valid: false, expired: true, reason: 'This offer has expired', offer: offerPayload, link: linkPayload };
    }

    if (isInactive) {
      return { valid: false, expired: true, reason: 'This offer is no longer active', offer: offerPayload, link: linkPayload };
    }

    if (referralDisabled) {
      return { valid: false, expired: true, reason: 'Referral program has ended for this offer', offer: offerPayload, link: linkPayload };
    }

    return { valid: true, expired: false, offer: offerPayload, link: linkPayload };
  },
});
