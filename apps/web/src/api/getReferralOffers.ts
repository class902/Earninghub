import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';

export default createEndpoint({
  description: 'Get all active offers with referral enabled — for the /refer hub dropdown',
  inputSchema: z.object({}),
  outputSchema: z.object({
    offers: z.array(z.object({
      id: z.string(),
      name: z.string(),
      emoji: z.string(),
      slug: z.string(),
      payout: z.number(),
      logoUrl: z.string(),
      category: z.string(),
      referrerFormConfig: z.string(),
      // ── CHANGES: Three-way split fields ──
      referralAdminCut: z.number(),
      referralDefaultReferrerCut: z.number(),
      referralDefaultUserEstimate: z.number(),
    })),
  }),
  execute: async () => {
    const { records } = await db.offers.findAll({ filters: { status: 'Active', referralEnabled: true } });
    const offers = records
      .filter(r => !r.isPrivate)
      .map(r => ({
        id: r.id,
        name: r.name || '',
        emoji: r.emoji || '🎯',
        slug: (r.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        payout: r.payout || 0,
        logoUrl: r.logoUrl || '',
        category: r.category || '',
        referrerFormConfig: r.referrerFormConfig || '[]',
        referralAdminCut: r.referralAdminCut || 0,
        referralDefaultReferrerCut: r.referralDefaultReferrerCut || 0,
        referralDefaultUserEstimate: r.referralDefaultUserEstimate || 0,
      }));
    return { offers };
  },
});
