import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';
import { verifyAdmin, logAudit, validateLinkTransition } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin changes a referral link status (Pause, Resume, Terminate, Revoke) with audit trail',
  inputSchema: z.object({
    password: z.string(),
    linkId: z.string().min(1),
    targetStatus: z.enum(['Active', 'Paused', 'Terminated', 'Revoked', 'Disabled']),
    reason: z.string().optional(),
    note: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const link = await db.referralLinks.findOne({ id: input.linkId });
    if (!link) throw new ApiError({ code: 'NOT_FOUND', message: 'Link not found' });

    const currentStatus = link.linkStatus || 'Active';
    const validation = validateLinkTransition(currentStatus, input.targetStatus);
    if (!validation.valid) {
      throw new ApiError({ code: 'BAD_REQUEST', message: validation.reason || 'Invalid transition' });
    }

    const now = new Date().toISOString();
    const updateRecord: Record<string, unknown> = {
      linkStatus: input.targetStatus,
      lastActivityAt: now,
    };

    // Set lifecycle timestamps
    if (input.targetStatus === 'Paused') {
      updateRecord.pausedAt = now;
      updateRecord.pausedBy = 'Admin';
      updateRecord.pauseReason = input.reason || null;
    } else if (input.targetStatus === 'Active' && currentStatus === 'Paused') {
      updateRecord.resumedAt = now;
    } else if (input.targetStatus === 'Terminated') {
      updateRecord.terminatedAt = now;
      updateRecord.terminatedBy = 'Admin';
      updateRecord.terminateReason = input.reason || null;
    } else if (input.targetStatus === 'Revoked') {
      updateRecord.revokedAt = now;
      updateRecord.revokedBy = 'Admin';
      updateRecord.revokeReason = input.reason || null;
    }

    await db.referralLinks.update({ id: input.linkId, record: updateRecord });

    const actionLabel = currentStatus === 'Paused' && input.targetStatus === 'Active'
      ? 'Link Resumed' : `Link ${input.targetStatus}`;

    await logAudit({
      entityType: 'Link',
      entityId: input.linkId,
      action: actionLabel,
      actor: 'Admin',
      previousValue: currentStatus,
      newValue: input.targetStatus,
      reason: input.reason,
      note: input.note,
    });

    return { success: true, message: `Link ${input.targetStatus.toLowerCase()} successfully` };
  },
});
