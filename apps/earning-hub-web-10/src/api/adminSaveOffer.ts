import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: create or update an offer (with rank, timer, slots, screenshot, referral config + 3-way split)',
  inputSchema: z.object({
    password: z.string(), id: z.string().optional(),
    name: z.string(), emoji: z.string(), description: z.string(),
    steps: z.string(), payout: z.number(), category: z.string(),
    tags: z.string(), redirectLink: z.string(), status: z.string(),
    fieldsConfig: z.string(), formEnabled: z.boolean(), formConfig: z.string(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
    warningPopupImage: z.string().optional(),
    warningPopupActive: z.boolean().optional(),
    leadConfigEnabled: z.boolean().optional(),
    termsAndConditions: z.string().optional(),
    rank: z.number().optional().default(0),
    expiresAt: z.string().optional(),
    totalSlots: z.number().optional(),
    filledSlots: z.number().optional(),
    sampleScreenshotUrl: z.string().optional(),
    isPrivate: z.boolean().optional().default(false),
    privateSlug: z.string().optional().default(''),
    referrerFormConfig: z.string().optional().default('[]'),
    referralEnabled: z.boolean().optional().default(false),
    referralAdminCut: z.number().optional().default(0),
    referralDefaultReferrerCut: z.number().optional().default(0),
    referralDefaultUserEstimate: z.number().optional().default(0),
    payoutDisplay: z.string().optional().default(''),
    // New explicit payout split fields
    userPayout: z.number().optional(),
    adminPayout: z.number().optional(),
  }),
  outputSchema: z.object({ success: z.boolean(), id: z.string() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    // Validate payout split
    const totalPayout = input.payout;
    const userPay = input.userPayout ?? Math.round(totalPayout * 0.8);
    const adminPay = input.adminPayout ?? (totalPayout - userPay);

    if (userPay < 0) throw new ZiteError({ code: 'BAD_REQUEST', message: 'User payout cannot be negative' });
    if (adminPay < 0) throw new ZiteError({ code: 'BAD_REQUEST', message: 'Admin payout cannot be negative' });
    if (userPay > totalPayout) throw new ZiteError({ code: 'BAD_REQUEST', message: 'User payout cannot exceed total payout' });

    // Validate referral split
    if (input.referralEnabled) {
      const splitSum = (input.referralAdminCut || 0) + (input.referralDefaultReferrerCut || 0) + (input.referralDefaultUserEstimate || 0);
      if (splitSum > 0 && Math.abs(splitSum - input.payout) > 0.5) {
        throw new ZiteError({ code: 'BAD_REQUEST', message: `Referral split sum (₹${splitSum}) must equal offer payout (₹${input.payout})` });
      }
    }

    const record: Record<string, unknown> = {
      name: input.name,
      emoji: input.emoji,
      description: input.description,
      steps: input.steps,
      payout: input.payout,
      userPayout: userPay,
      adminPayout: adminPay,
      category: input.category,
      tags: input.tags,
      redirectLink: input.redirectLink,
      status: input.status,
      fieldsConfig: input.fieldsConfig,
      formEnabled: input.formEnabled,
      formConfig: input.formConfig,
      logoUrl: input.logoUrl || '',
      bannerUrl: input.bannerUrl || '',
      warningPopupImage: input.warningPopupImage || '',
      warningPopupActive: input.warningPopupActive ?? false,
      leadConfigEnabled: input.leadConfigEnabled ?? true,
      termsAndConditions: input.termsAndConditions || '',
      sortRank: input.rank ?? 0,
      totalSlots: input.totalSlots ?? 0,
      filledSlots: input.filledSlots ?? 0,
      sampleScreenshotUrl: input.sampleScreenshotUrl || '',
      isPrivate: input.isPrivate ?? false,
      privateSlug: input.privateSlug || '',
      referrerFormConfig: input.referrerFormConfig || '[]',
      referralEnabled: input.referralEnabled ?? false,
      referralAdminCut: input.referralAdminCut ?? 0,
      referralDefaultReferrerCut: input.referralDefaultReferrerCut ?? 0,
      referralDefaultUserEstimate: input.referralDefaultUserEstimate ?? 0,
      payoutDisplay: input.payoutDisplay || '',
    };

    if (input.expiresAt && input.expiresAt.trim()) {
      record.expiresAt = input.expiresAt.trim();
    }

    try {
      if (input.id) {
        await zite.offers.update({ id: input.id, record });
        return { success: true, id: input.id };
      }
      const created = await zite.offers.create({ record });
      return { success: true, id: created.id };
    } catch (err) {
      const msg = String((err as Error)?.message || 'Database operation failed');
      throw new ZiteError({ code: 'INTERNAL_ERROR', message: `Save failed: ${msg}` });
    }
  },
});
