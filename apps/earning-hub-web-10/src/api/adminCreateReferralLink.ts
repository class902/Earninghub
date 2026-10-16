import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { verifyAdmin, logAudit, generateCode } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin generates a referral link for a selected offer and referrer',
  inputSchema: z.object({
    password: z.string(),
    offerName: z.string().min(1),
    offerId: z.string().min(1),
    offerSlug: z.string().optional(),
    referrerName: z.string().min(1),
    referrerUpi: z.string().optional(),
    referrerCut: z.number().optional(),
    userCut: z.number().optional(),
    expiryDate: z.string().optional(),
    referralLimit: z.number().optional(),
    internalNote: z.string().optional(),
    customReferrerData: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    linkId: z.string(),
    referralCode: z.string(),
  }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    // Generate unique code (retry up to 5 times)
    let code = '';
    for (let i = 0; i < 5; i++) {
      code = generateCode(7);
      const existing = await zite.referralLinks.findOne({ filters: { referralCode: code } });
      if (!existing) break;
      if (i === 4) throw new ZiteError({ code: 'INTERNAL_ERROR', message: 'Failed to generate unique code' });
    }

    const record = await zite.referralLinks.create({
      record: {
        referrerName: input.referrerName,
        offerName: input.offerName,
        offerId: input.offerId,
        offerSlug: input.offerSlug || null,
        referralCode: code,
        linkStatus: 'Active',
        clickCount: 0,
        uniqueClickCount: 0,
        leadCount: 0,
        referrerUpi: input.referrerUpi || null,
        referrerCut: input.referrerCut ?? null,
        userCut: input.userCut ?? null,
        referrerSplit: input.referrerCut ? String(input.referrerCut) : null,
        expiryDate: input.expiryDate || null,
        referralLimit: input.referralLimit ?? null,
        internalNote: input.internalNote || null,
        customReferrerData: input.customReferrerData || '{}',
        createdByType: 'Admin',
        lastActivityAt: new Date().toISOString(),
      },
    });

    await logAudit({
      entityType: 'Link',
      entityId: record.id,
      action: 'Link Created',
      actor: 'Admin',
      newValue: JSON.stringify({ offer: input.offerName, referrer: input.referrerName, code }),
    });

    return { success: true, linkId: record.id, referralCode: code };
  },
});
