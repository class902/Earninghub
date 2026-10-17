import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

export default createEndpoint({
  description: 'Admin: Factory reset — permanently delete all data from all tables',
  inputSchema: z.object({
    password: z.string(),
    confirmText: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    deletedLeads: z.number(),
    deletedOffers: z.number(),
    deletedSubmissions: z.number(),
    deletedReferrals: z.number(),
    deletedReferralLinks: z.number(),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    if (input.confirmText !== 'DELETE ALL') {
      throw new ApiError({ code: 'BAD_REQUEST', message: 'Confirmation text must be "DELETE ALL"' });
    }

    let deletedLeads = 0, deletedOffers = 0, deletedSubmissions = 0, deletedReferrals = 0, deletedReferralLinks = 0;

    // Helper: paginated delete all records from a table
    async function deleteAll(table: { findAll: (p: { limit: number; fields: string[] }) => Promise<{ records: { id: string }[] }>; delete: (p: { id: string }) => Promise<unknown> }) {
      let batch = await table.findAll({ limit: 100, fields: ['id'] });
      let count = 0;
      while (batch.records.length > 0) {
        await Promise.all(batch.records.map(r => table.delete({ id: r.id })));
        count += batch.records.length;
        if (batch.records.length < 100) break;
        batch = await table.findAll({ limit: 100, fields: ['id'] });
      }
      return count;
    }

    deletedLeads = await deleteAll(db.leads as any);
    deletedOffers = await deleteAll(db.offers as any);
    deletedSubmissions = await deleteAll(db.cashbackSubmissions as any);
    deletedReferrals = await deleteAll(db.referrals as any);
    deletedReferralLinks = await deleteAll(db.referralLinks as any);

    return { success: true, deletedLeads, deletedOffers, deletedSubmissions, deletedReferrals, deletedReferralLinks };
  },
});
