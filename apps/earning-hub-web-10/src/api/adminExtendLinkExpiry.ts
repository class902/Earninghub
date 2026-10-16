import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { verifyAdmin, logAudit } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin extends the expiry date of a referral link with audit trail',
  inputSchema: z.object({
    password: z.string(),
    linkId: z.string().min(1),
    newExpiryDate: z.string().min(1),
    reason: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const link = await zite.referralLinks.findOne({ id: input.linkId });
    if (!link) throw new ZiteError({ code: 'NOT_FOUND', message: 'Link not found' });

    if (['Terminated', 'Revoked'].includes(link.linkStatus || '')) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: `Cannot extend expiry of a ${link.linkStatus} link` });
    }

    const previousExpiry = link.expiryDate || 'None';

    const updateRecord: Record<string, unknown> = {
      expiryDate: input.newExpiryDate,
      lastActivityAt: new Date().toISOString(),
    };

    // If link was Expired, reactivate it
    if (link.linkStatus === 'Expired') {
      updateRecord.linkStatus = 'Active';
    }

    await zite.referralLinks.update({ id: input.linkId, record: updateRecord });

    await logAudit({
      entityType: 'Link',
      entityId: input.linkId,
      action: 'Expiry Extended',
      actor: 'Admin',
      previousValue: previousExpiry,
      newValue: input.newExpiryDate,
      reason: input.reason,
    });

    return { success: true };
  },
});
