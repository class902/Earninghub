import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { verifyAdmin, logAudit } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin adds a public remark and/or internal note to a referral lead with audit',
  inputSchema: z.object({
    password: z.string(),
    referralLeadId: z.string().min(1),
    publicRemark: z.string().optional(),
    internalNote: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const lead = await zite.referralLeads.findOne({ id: input.referralLeadId });
    if (!lead) throw new ZiteError({ code: 'NOT_FOUND', message: 'Referral lead not found' });

    if (!input.publicRemark && !input.internalNote) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'Provide a public remark or internal note' });
    }

    const updateRecord: Record<string, unknown> = {};
    if (input.publicRemark !== undefined) updateRecord.publicRemark = input.publicRemark;
    if (input.internalNote !== undefined) updateRecord.internalNote = input.internalNote;

    await zite.referralLeads.update({ id: input.referralLeadId, record: updateRecord });

    if (input.publicRemark) {
      await logAudit({
        entityType: 'Referral',
        entityId: input.referralLeadId,
        action: 'Public Remark Added',
        actor: 'Admin',
        newValue: input.publicRemark,
      });
    }

    if (input.internalNote) {
      await logAudit({
        entityType: 'Referral',
        entityId: input.referralLeadId,
        action: 'Internal Note Added',
        actor: 'Admin',
        newValue: input.internalNote,
      });
    }

    return { success: true };
  },
});
