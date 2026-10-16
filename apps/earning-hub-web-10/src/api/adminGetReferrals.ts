import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: get all referral records with network stats',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({
    referrals: z.array(z.object({
      id: z.string(),
      referrerUpi: z.string(),
      referredUpi: z.string(),
      offerName: z.string(),
      bonusPaid: z.boolean(),
      createdAt: z.string(),
    })),
    stats: z.object({
      total: z.number(),
      uniqueReferrers: z.number(),
      bonusPaid: z.number(),
      bonusPending: z.number(),
    }),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    const { records } = await zite.referrals.findAll({ limit: 500 });
    records.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const uniqueReferrers = new Set(records.map(r => r.referrerUpi || '')).size;
    const bonusPaid = records.filter(r => r.bonusPaid).length;

    return {
      referrals: records.map(r => ({
        id: r.id,
        referrerUpi: r.referrerUpi || '',
        referredUpi: r.referredUpi || '',
        offerName: r.offerName || '',
        bonusPaid: r.bonusPaid ?? false,
        createdAt: r.createdAt || '',
      })),
      stats: {
        total: records.length,
        uniqueReferrers,
        bonusPaid,
        bonusPending: records.length - bonusPaid,
      },
    };
  },
});
