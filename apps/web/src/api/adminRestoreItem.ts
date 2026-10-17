import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

export default createEndpoint({
  description: 'Admin: restore a trashed item (lead or offer)',
  inputSchema: z.object({
    password: z.string(),
    id: z.string(),
    type: z.enum(['lead', 'offer']),
    previousStatus: z.string().optional(), // for offer restore
    previousActionConfig: z.string().optional(), // for lead restore
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    if (input.type === 'lead') {
      const record = await db.leads.findOne({ id: input.id });
      if (!record) throw new ApiError({ code: 'NOT_FOUND', message: 'Lead not found' });

      let ac: Record<string, unknown> = {};
      try { ac = JSON.parse(record.actionConfig || '{}'); } catch {}

      // Remove trash markers
      delete ac._trashed;
      delete ac._trashedAt;

      await db.leads.update({ id: input.id, record: { actionConfig: JSON.stringify(ac) } });
    } else {
      const record = await db.offers.findOne({ id: input.id });
      if (!record) throw new ApiError({ code: 'NOT_FOUND', message: 'Offer not found' });

      const restoreStatus = input.previousStatus && input.previousStatus !== '__TRASH__'
        ? input.previousStatus
        : 'Inactive';

      await db.offers.update({ id: input.id, record: { status: restoreStatus } });
    }

    return { success: true };
  },
});
