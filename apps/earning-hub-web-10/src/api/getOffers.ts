import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';

// PUBLIC offer schema — only user-facing data, NO admin financials
const offerSchema = z.object({
  id: z.string(), name: z.string(), emoji: z.string(), description: z.string(),
  steps: z.string(), payout: z.number(), // This is USER payout (the reward they get)
  category: z.string(), tags: z.string(),
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
  referralEnabled: z.boolean(),
  referrerFormConfig: z.string(),
  // Referral user estimate only (not admin cut)
  referralDefaultReferrerCut: z.number(),
  referralDefaultUserEstimate: z.number(),
  payoutDisplay: z.string(),
});

export default createEndpoint({
  description: 'Get all active offers sorted by custom rank (highest first)',
  inputSchema: z.object({}),
  outputSchema: z.object({ offers: z.array(offerSchema) }),
  execute: async () => {
    const { records } = await zite.offers.findAll({});
    const offers = records
      .filter(r => r.status?.toLowerCase() === 'active' && !r.isPrivate)
      .map(r => {
        // Determine user payout: use explicit userPayout if set, else try fieldsConfig, else total
        let effectiveUserPayout = r.payout || 0;
        if (r.userPayout != null && r.userPayout > 0) {
          effectiveUserPayout = r.userPayout;
        } else {
          // Legacy: try reading from fieldsConfig
          try {
            const fc = JSON.parse(r.fieldsConfig || '{}');
            if (fc && typeof fc === 'object' && !Array.isArray(fc) && fc.userPayout > 0) {
              effectiveUserPayout = fc.userPayout;
            }
          } catch {}
        }

        // Parse structured terms for public consumption
        let publicTerms = r.termsAndConditions || '';
        try {
          const parsed = JSON.parse(publicTerms);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && 'text' in parsed[0]) {
            // Convert structured terms to clean newline-separated text for backward compat
            publicTerms = parsed.map((t: { text?: string }) => t.text || '').filter(Boolean).join('\n');
          }
        } catch {
          // Already plain text — keep as-is
        }

        // Parse structured steps for public consumption
        let publicSteps = r.steps || '';
        try {
          const fc = JSON.parse(r.fieldsConfig || '{}');
          if (fc?.structuredSteps && Array.isArray(fc.structuredSteps) && fc.structuredSteps.length > 0) {
            publicSteps = fc.structuredSteps
              .filter((s: { text?: string }) => s.text?.trim())
              .map((s: { text: string }, i: number) => `${i + 1}. ${s.text}`)
              .join('\n');
          }
        } catch {}

        // Sanitize fieldsConfig to remove admin-only data before sending to public
        let safeFieldsConfig = r.fieldsConfig || '[]';
        try {
          const fc = JSON.parse(safeFieldsConfig);
          if (fc && typeof fc === 'object' && !Array.isArray(fc)) {
            // Only keep public-relevant config
            safeFieldsConfig = JSON.stringify({
              fields: fc.fields || [],
              showPayoutToUser: fc.showPayoutToUser,
              termsExpanded: fc.termsExpanded,
              stepsExpanded: fc.stepsExpanded,
              useGlobalWifiBanner: fc.useGlobalWifiBanner,
              // Structured data for public rendering
              structuredSteps: (fc.structuredSteps || []).map((s: any) => ({ text: s.text, imageUrl: s.imageUrl })),
              structuredTerms: (fc.structuredTerms || []).map((t: any) => ({ text: t.text, imageUrl: t.imageUrl })),
            });
          }
        } catch {}

        return {
          id: r.id, name: r.name || '', emoji: r.emoji || '💰',
          description: r.description || '', steps: publicSteps,
          payout: effectiveUserPayout, // PUBLIC: user payout only
          category: r.category || '', tags: r.tags || '',
          redirectLink: r.redirectLink || '', status: r.status || '',
          fieldsConfig: safeFieldsConfig,
          formEnabled: r.formEnabled ?? false,
          formConfig: r.formConfig || '{}',
          logoUrl: r.logoUrl || '',
          bannerUrl: r.bannerUrl || '',
          warningPopupImage: r.warningPopupImage || '',
          warningPopupActive: r.warningPopupActive ?? false,
          leadConfigEnabled: r.leadConfigEnabled ?? true,
          termsAndConditions: publicTerms,
          rank: r.sortRank || 0,
          expiresAt: r.expiresAt || undefined,
          totalSlots: r.totalSlots || 0,
          filledSlots: r.filledSlots || 0,
          sampleScreenshotUrl: r.sampleScreenshotUrl || '',
          referralEnabled: r.referralEnabled ?? false,
          referrerFormConfig: r.referrerFormConfig || '[]',
          // Only non-admin referral data
          referralDefaultReferrerCut: r.referralDefaultReferrerCut || 0,
          referralDefaultUserEstimate: r.referralDefaultUserEstimate || 0,
          payoutDisplay: (r as any).payoutDisplay || '',
        };
      });

    offers.sort((a, b) => {
      if (a.rank === 0 && b.rank === 0) return 0;
      if (a.rank === 0) return 1;
      if (b.rank === 0) return -1;
      return b.rank - a.rank;
    });

    return { offers };
  },
});
