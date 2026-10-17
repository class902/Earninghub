import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';
import { verifyAdmin } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin: update a referral link — edit referrer details, payout splits, status, poster toggle, notes',
  inputSchema: z.object({
    password: z.string(),
    id: z.string(),
    referrerName: z.string().optional(),
    referrerUpi: z.string().optional(),
    customReferrerData: z.string().optional(),
    referrerCut: z.number().optional(),
    userCut: z.number().optional(),
    linkStatus: z.enum(['Active', 'Paused', 'Disabled', 'Revoked']).optional(),
    internalNote: z.string().optional(),
    expiryDate: z.string().nullable().optional(),
    referralLimit: z.number().nullable().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const link = await db.referralLinks.findOne({ id: input.id });
    if (!link) throw new ApiError({ code: 'NOT_FOUND', message: 'Link not found' });

    const updateRecord: Record<string, unknown> = {};
    if (input.referrerName !== undefined) updateRecord.referrerName = input.referrerName;
    if (input.referrerUpi !== undefined) updateRecord.referrerUpi = input.referrerUpi;
    if (input.customReferrerData !== undefined) updateRecord.customReferrerData = input.customReferrerData;
    if (input.referrerCut !== undefined) updateRecord.referrerCut = input.referrerCut;
    if (input.userCut !== undefined) updateRecord.userCut = input.userCut;
    if (input.linkStatus !== undefined) updateRecord.linkStatus = input.linkStatus;
    if (input.internalNote !== undefined) updateRecord.internalNote = input.internalNote;
    if (input.expiryDate !== undefined) updateRecord.expiryDate = input.expiryDate;
    if (input.referralLimit !== undefined) updateRecord.referralLimit = input.referralLimit;

    if (Object.keys(updateRecord).length === 0) {
      throw new ApiError({ code: 'BAD_REQUEST', message: 'Nothing to update' });
    }

    await db.referralLinks.update({ id: input.id, record: updateRecord });

    // Log audit trail
    try {
      const changes = Object.keys(updateRecord).join(', ');
      await db.referralAuditLog.create({
        record: {
          entityType: 'ReferralLink',
          entityId: input.id,
          action: 'Link Updated',
          actor: 'Admin',
          previousValue: '',
          newValue: changes,
          reason: `Fields updated: ${changes}`,
        },
      });
    } catch {}

    return { success: true };
  },
});
