import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';
import { verifyAdmin, logAudit, validateLeadTransition, validateCashbackTransition, validateRewardTransition, validatePaymentTransition } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin updates referral lead statuses (lead, cashback, reward, payment) with validation and audit',
  inputSchema: z.object({
    password: z.string(),
    referralLeadId: z.string().min(1),
    leadStatus: z.string().optional(),
    cashbackStatus: z.string().optional(),
    cashbackAmount: z.number().optional(),
    rewardStatus: z.string().optional(),
    rewardAmount: z.number().optional(),
    paymentStatus: z.string().optional(),
    rejectionReason: z.string().optional(),
    reason: z.string().optional(),
    note: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const lead = await db.referralLeads.findOne({ id: input.referralLeadId });
    if (!lead) throw new ApiError({ code: 'NOT_FOUND', message: 'Referral lead not found' });

    const now = new Date().toISOString();
    const updateRecord: Record<string, unknown> = {};
    const auditActions: { action: string; prev: string; next: string }[] = [];

    // Lead status transition
    if (input.leadStatus && input.leadStatus !== lead.leadStatus) {
      const v = validateLeadTransition(lead.leadStatus || 'Clicked', input.leadStatus);
      if (!v.valid) throw new ApiError({ code: 'BAD_REQUEST', message: v.reason || 'Invalid lead transition' });
      updateRecord.leadStatus = input.leadStatus;
      auditActions.push({ action: 'Lead Status Changed', prev: lead.leadStatus || 'Clicked', next: input.leadStatus });
      if (input.leadStatus === 'Qualified') updateRecord.qualifiedAt = now;
    }

    // Cashback status transition
    if (input.cashbackStatus && input.cashbackStatus !== lead.cashbackStatus) {
      const v = validateCashbackTransition(lead.cashbackStatus || 'Pending', input.cashbackStatus);
      if (!v.valid) throw new ApiError({ code: 'BAD_REQUEST', message: v.reason || 'Invalid cashback transition' });
      updateRecord.cashbackStatus = input.cashbackStatus;
      auditActions.push({ action: 'Cashback Status Changed', prev: lead.cashbackStatus || 'Pending', next: input.cashbackStatus });
      if (input.cashbackStatus === 'Paid') updateRecord.cashbackPaidAt = now;
    }

    // Reward status transition
    if (input.rewardStatus && input.rewardStatus !== lead.rewardStatus) {
      const v = validateRewardTransition(lead.rewardStatus || 'Pending', input.rewardStatus);
      if (!v.valid) throw new ApiError({ code: 'BAD_REQUEST', message: v.reason || 'Invalid reward transition' });
      updateRecord.rewardStatus = input.rewardStatus;
      auditActions.push({ action: 'Reward Status Changed', prev: lead.rewardStatus || 'Pending', next: input.rewardStatus });
      if (input.rewardStatus === 'Paid') updateRecord.rewardPaidAt = now;
    }

    // Payment status transition
    if (input.paymentStatus && input.paymentStatus !== lead.paymentStatus) {
      const v = validatePaymentTransition(lead.paymentStatus || 'Pending', input.paymentStatus);
      if (!v.valid) throw new ApiError({ code: 'BAD_REQUEST', message: v.reason || 'Invalid payment transition' });
      updateRecord.paymentStatus = input.paymentStatus;
      auditActions.push({ action: 'Payment Status Changed', prev: lead.paymentStatus || 'Pending', next: input.paymentStatus });
    }

    // Financial amounts
    if (input.cashbackAmount !== undefined) updateRecord.cashbackAmount = input.cashbackAmount;
    if (input.rewardAmount !== undefined) updateRecord.rewardAmount = input.rewardAmount;
    if (input.rejectionReason) updateRecord.rejectionReason = input.rejectionReason;

    if (Object.keys(updateRecord).length === 0) {
      throw new ApiError({ code: 'BAD_REQUEST', message: 'No changes specified' });
    }

    await db.referralLeads.update({ id: input.referralLeadId, record: updateRecord });

    // Log each status change as separate audit event
    for (const a of auditActions) {
      await logAudit({
        entityType: 'Referral',
        entityId: input.referralLeadId,
        action: a.action,
        actor: 'Admin',
        previousValue: a.prev,
        newValue: a.next,
        reason: input.reason,
        note: input.note,
      });
    }

    return { success: true, message: `Updated ${auditActions.length} status field(s) successfully` };
  },
});
