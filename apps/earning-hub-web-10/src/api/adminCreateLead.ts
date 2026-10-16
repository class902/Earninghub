import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: Manually create a lead entry',
  inputSchema: z.object({
    password: z.string(),
    offerName: z.string(),
    offerPayout: z.number(),
    leadData: z.string(),
    status: z.string().optional(),
    publicRemark: z.string().optional(),
    internalNote: z.string().optional(),
    actionConfig: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean(), id: z.string() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    if (!input.offerName.trim()) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'Offer name is required' });
    }

    let summary = 'Manual Entry';
    try {
      const data = JSON.parse(input.leadData);
      const upiEntry = Object.entries(data).find(([k]) => k.toLowerCase().includes('upi'));
      if (upiEntry) summary = String(upiEntry[1]);
      else {
        const nameEntry = Object.entries(data).find(([k]) => k.toLowerCase().includes('name'));
        if (nameEntry) summary = String(nameEntry[1]);
      }
    } catch {}

    const ts = Date.now();
    const leadId = `HUB_${ts.toString().slice(-7)}`;

    // Build initial actionConfig with status history
    let actionConfigJson = input.actionConfig || '{}';
    try {
      const ac = JSON.parse(actionConfigJson);
      if (!Array.isArray(ac.statusHistory)) {
        ac.statusHistory = [{ status: input.status || 'Pending', date: new Date().toISOString() }];
        actionConfigJson = JSON.stringify(ac);
      }
    } catch {
      actionConfigJson = JSON.stringify({
        statusHistory: [{ status: input.status || 'Pending', date: new Date().toISOString() }],
      });
    }

    try {
      const record = await zite.leads.create({
        record: {
          summary,
          offerName: input.offerName.trim(),
          offerPayout: input.offerPayout,
          leadData: input.leadData,
          status: input.status || 'Pending',
          leadId,
          publicRemark: input.publicRemark || '',
          internalNote: input.internalNote || '',
          actionConfig: actionConfigJson,
          createdByType: 'Admin',
        } as Record<string, unknown>,
      });
      return { success: true, id: record.id };
    } catch (err) {
      const msg = String((err as Error)?.message || 'Database operation failed');
      throw new ZiteError({ code: 'INTERNAL_ERROR', message: `Create failed: ${msg}` });
    }
  },
});
