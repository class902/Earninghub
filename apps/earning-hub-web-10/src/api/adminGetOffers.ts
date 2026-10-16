import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const offerSchema = z.object({
  id: z.string(), name: z.string(), emoji: z.string(), description: z.string(),
  steps: z.string(), payout: z.number(), category: z.string(), tags: z.string(),
  redirectLink: z.string(), status: z.string(), fieldsConfig: z.string(),
  formEnabled: z.boolean(), formConfig: z.string(),
  logoUrl: z.string(), bannerUrl: z.string(),
  warningPopupImage: z.string(),
  warningPopupActive: z.boolean(),
  leadConfigEnabled: z.boolean(),
  termsAndConditions: z.string(),
  rank: z.number(),
  expiresAt: z.string().optional(),
  totalSlots: z.number(),
  filledSlots: z.number(),
  sampleScreenshotUrl: z.string(),
  isPrivate: z.boolean(),
  privateSlug: z.string(),
  referrerFormConfig: z.string(),
  referralEnabled: z.boolean(),
  referralAdminCut: z.number(),
  referralDefaultReferrerCut: z.number(),
  referralDefaultUserEstimate: z.number(),
  payoutDisplay: z.string(),
  userPayout: z.number(),
  adminPayout: z.number(),
});

export default createEndpoint({
  description: 'Admin: get all active (non-trashed) offers',
  inputSchema: z.object({
    password: z.string(),
    includeTrash: z.boolean().optional(),
  }),
  outputSchema: z.object({ offers: z.array(offerSchema) }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    const { records } = await zite.offers.findAll({});

    const filtered = input.includeTrash
      ? records.filter(r => r.status === '__TRASH__')
      : records.filter(r => r.status !== '__TRASH__');

    const mapped = filtered.map(r => {
        // Resolve userPayout/adminPayout — try DB fields first, then fieldsConfig legacy
        let userPay = r.userPayout ?? 0;
        let adminPay = r.adminPayout ?? 0;
        if (userPay === 0 && adminPay === 0 && (r.payout || 0) > 0) {
          try {
            const fc = JSON.parse(r.fieldsConfig || '{}');
            if (fc && typeof fc === 'object' && !Array.isArray(fc)) {
              userPay = fc.userPayout ?? 0;
              adminPay = fc.adminPayout ?? 0;
            }
          } catch {}
          // If still zero, default to 80/20 split
          if (userPay === 0 && adminPay === 0) {
            userPay = Math.round((r.payout || 0) * 0.8);
            adminPay = (r.payout || 0) - userPay;
          }
        }

        return {
          id: r.id, name: r.name || '', emoji: r.emoji || '💰',
          description: r.description || '', steps: r.steps || '',
          payout: r.payout || 0, category: r.category || '',
          tags: r.tags || '', redirectLink: r.redirectLink || '',
          status: r.status || 'Inactive', fieldsConfig: r.fieldsConfig || '[]',
          formEnabled: r.formEnabled ?? false, formConfig: r.formConfig || '{}',
          logoUrl: r.logoUrl || '', bannerUrl: r.bannerUrl || '',
          warningPopupImage: r.warningPopupImage || '',
          warningPopupActive: r.warningPopupActive ?? false,
          leadConfigEnabled: r.leadConfigEnabled ?? true,
          termsAndConditions: r.termsAndConditions || '',
          rank: r.sortRank || 0,
          expiresAt: r.expiresAt || undefined,
          totalSlots: r.totalSlots || 0,
          filledSlots: r.filledSlots || 0,
          sampleScreenshotUrl: r.sampleScreenshotUrl || '',
          isPrivate: r.isPrivate ?? false,
          privateSlug: r.privateSlug || '',
          referrerFormConfig: r.referrerFormConfig || '[]',
          referralEnabled: r.referralEnabled ?? false,
          referralAdminCut: r.referralAdminCut || 0,
          referralDefaultReferrerCut: r.referralDefaultReferrerCut || 0,
          referralDefaultUserEstimate: r.referralDefaultUserEstimate || 0,
          payoutDisplay: (r as any).payoutDisplay || '',
          userPayout: userPay,
          adminPayout: adminPay,
        };
    });

    mapped.sort((a, b) => {
      if (a.rank === 0 && b.rank === 0) return 0;
      if (a.rank === 0) return 1;
      if (b.rank === 0) return -1;
      return b.rank - a.rank;
    });

    return { offers: mapped };
  },
});
