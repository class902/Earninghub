import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';

const offerSchema = z.object({
  id: z.string(), name: z.string(), emoji: z.string(), description: z.string(),
  steps: z.string(), payout: z.number(), category: z.string(), tags: z.string(),
  redirectLink: z.string(), status: z.string(), fieldsConfig: z.string(),
  formEnabled: z.boolean(), formConfig: z.string(),
  logoUrl: z.string(), bannerUrl: z.string(),
  warningPopupImage: z.string(), warningPopupActive: z.boolean(),
  leadConfigEnabled: z.boolean(), termsAndConditions: z.string(),
  rank: z.number(),
  expiresAt: z.string().optional(),
  totalSlots: z.number(), filledSlots: z.number(),
  sampleScreenshotUrl: z.string(),
  isPrivate: z.boolean(), privateSlug: z.string(),
  referralEnabled: z.boolean(),
  referrerFormConfig: z.string(),
  referralDefaultReferrerCut: z.number(),
  referralDefaultUserEstimate: z.number(),
  payoutDisplay: z.string(),
});

export default createEndpoint({
  description: 'Get a private/exclusive offer by its privateSlug — used for /exclusive/:slug pages',
  inputSchema: z.object({ slug: z.string() }),
  outputSchema: z.object({
    offer: offerSchema.nullable(),
    found: z.boolean(),
  }),
  execute: async ({ input }) => {
    const { records } = await db.offers.findAll({ filters: { privateSlug: input.slug } });

    const r = records.find(o =>
      o.privateSlug === input.slug &&
      o.isPrivate === true &&
      o.status !== '__TRASH__'
    );

    if (!r) return { offer: null, found: false };

    // Determine user payout
    let effectiveUserPayout = r.payout || 0;
    if (r.userPayout != null && r.userPayout > 0) {
      effectiveUserPayout = r.userPayout;
    } else {
      try {
        const fc = JSON.parse(r.fieldsConfig || '{}');
        if (fc && typeof fc === 'object' && !Array.isArray(fc) && fc.userPayout > 0) {
          effectiveUserPayout = fc.userPayout;
        }
      } catch {}
    }

    // Parse terms for public display
    let publicTerms = r.termsAndConditions || '';
    try {
      const parsed = JSON.parse(publicTerms);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'text' in parsed[0]) {
        publicTerms = parsed.map((t: { text?: string }) => t.text || '').filter(Boolean).join('\n');
      }
    } catch {}

    // Sanitize fieldsConfig
    let safeFieldsConfig = r.fieldsConfig || '[]';
    try {
      const fc = JSON.parse(safeFieldsConfig);
      if (fc && typeof fc === 'object' && !Array.isArray(fc)) {
        safeFieldsConfig = JSON.stringify({
          fields: fc.fields || [],
          showPayoutToUser: fc.showPayoutToUser,
          termsExpanded: fc.termsExpanded,
          stepsExpanded: fc.stepsExpanded,
          useGlobalWifiBanner: fc.useGlobalWifiBanner,
          structuredSteps: (fc.structuredSteps || []).map((s: any) => ({ text: s.text, imageUrl: s.imageUrl })),
          structuredTerms: (fc.structuredTerms || []).map((t: any) => ({ text: t.text, imageUrl: t.imageUrl })),
        });
      }
    } catch {}

    return {
      found: true,
      offer: {
        id: r.id, name: r.name || '', emoji: r.emoji || '💰',
        description: r.description || '', steps: r.steps || '',
        payout: effectiveUserPayout,
        category: r.category || '', tags: r.tags || '',
        redirectLink: r.redirectLink || '', status: r.status || 'Active',
        fieldsConfig: safeFieldsConfig,
        formEnabled: r.formEnabled ?? false,
        formConfig: r.formConfig || '{}',
        logoUrl: r.logoUrl || '', bannerUrl: r.bannerUrl || '',
        warningPopupImage: r.warningPopupImage || '',
        warningPopupActive: r.warningPopupActive ?? false,
        leadConfigEnabled: r.leadConfigEnabled ?? true,
        termsAndConditions: publicTerms,
        rank: r.sortRank || 0,
        expiresAt: r.expiresAt || undefined,
        totalSlots: r.totalSlots || 0,
        filledSlots: r.filledSlots || 0,
        sampleScreenshotUrl: r.sampleScreenshotUrl || '',
        isPrivate: r.isPrivate ?? true,
        privateSlug: r.privateSlug || '',
        referralEnabled: r.referralEnabled ?? false,
        referrerFormConfig: r.referrerFormConfig || '[]',
        referralDefaultReferrerCut: r.referralDefaultReferrerCut || 0,
        referralDefaultUserEstimate: r.referralDefaultUserEstimate || 0,
        payoutDisplay: (r as any).payoutDisplay || '',
      },
    };
  },
});
