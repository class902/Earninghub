import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

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
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    if (input.confirmText !== 'DELETE ALL') {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'Confirmation text must be "DELETE ALL"' });
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

    deletedLeads = await deleteAll(zite.leads as any);
    deletedOffers = await deleteAll(zite.offers as any);
    deletedSubmissions = await deleteAll(zite.cashbackSubmissions as any);
    deletedReferrals = await deleteAll(zite.referrals as any);
    deletedReferralLinks = await deleteAll(zite.referralLinks as any);

    return { success: true, deletedLeads, deletedOffers, deletedSubmissions, deletedReferrals, deletedReferralLinks };
  },
});
