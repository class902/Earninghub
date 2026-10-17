import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';
import { verifyAdmin } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin gets full referral lead detail including linked link info and audit timeline',
  inputSchema: z.object({
    password: z.string(),
    referralLeadId: z.string().min(1),
  }),
  outputSchema: z.object({
    referral: z.object({
      id: z.string(),
      referralId: z.number().nullable(),
      referredUserName: z.string(),
      referredUserIdentifier: z.string(),
      referrerName: z.string(),
      referrerUpi: z.string(),
      offerName: z.string(),
      offerId: z.string(),
      leadId: z.string(),
      referralLinkId: z.string(),
      referralCode: z.string(),
      leadStatus: z.string(),
      cashbackStatus: z.string(),
      cashbackAmount: z.number(),
      rewardStatus: z.string(),
      rewardAmount: z.number(),
      paymentStatus: z.string(),
      publicRemark: z.string(),
      internalNote: z.string(),
      rejectionReason: z.string(),
      flaggedForReview: z.boolean(),
      flagReason: z.string(),
      source: z.string(),
      createdByType: z.string(),
      qualifiedAt: z.string().nullable(),
      cashbackPaidAt: z.string().nullable(),
      rewardPaidAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
    link: z.object({
      id: z.string(),
      referralCode: z.string(),
      linkStatus: z.string(),
      clickCount: z.number(),
      offerName: z.string(),
    }).nullable(),
    timeline: z.array(z.object({
      eventId: z.number().nullable(),
      action: z.string(),
      actor: z.string(),
      previousValue: z.string(),
      newValue: z.string(),
      reason: z.string(),
      note: z.string(),
      createdAt: z.string(),
    })),
  }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const lead = await db.referralLeads.findOne({ id: input.referralLeadId });
    if (!lead) throw new ApiError({ code: 'NOT_FOUND', message: 'Referral lead not found' });

    // Get linked link info
    let linkInfo: { id: string; referralCode: string; linkStatus: string; clickCount: number; offerName: string } | null = null;
    if (lead.referralLinkId) {
      const link = await db.referralLinks.findOne({ id: lead.referralLinkId });
      if (link) {
        linkInfo = {
          id: link.id,
          referralCode: link.referralCode || '',
          linkStatus: link.linkStatus || 'Active',
          clickCount: link.clickCount || 0,
          offerName: link.offerName || '',
        };
      }
    }

    // Get audit timeline
    const auditResult = await db.sql({
      query: `
        SELECT autonumber_id, "action", "actor", "previousValue", "newValue", "reason", "note", created_at
        FROM "ReferralAuditLog"
        WHERE "entityId" = $1
        ORDER BY created_at ASC
      `,
      params: [input.referralLeadId],
    });

    return {
      referral: {
        id: lead.id,
        referralId: lead.referralId ?? null,
        referredUserName: lead.referredUserName || '',
        referredUserIdentifier: lead.referredUserIdentifier || '',
        referrerName: lead.referrerName || '',
        referrerUpi: lead.referrerUpi || '',
        offerName: lead.offerName || '',
        offerId: lead.offerId || '',
        leadId: lead.leadId || '',
        referralLinkId: lead.referralLinkId || '',
        referralCode: lead.referralCode || '',
        leadStatus: lead.leadStatus || 'Clicked',
        cashbackStatus: lead.cashbackStatus || 'Pending',
        cashbackAmount: lead.cashbackAmount || 0,
        rewardStatus: lead.rewardStatus || 'Pending',
        rewardAmount: lead.rewardAmount || 0,
        paymentStatus: lead.paymentStatus || 'Pending',
        publicRemark: lead.publicRemark || '',
        internalNote: lead.internalNote || '',
        rejectionReason: lead.rejectionReason || '',
        flaggedForReview: lead.flaggedForReview ?? false,
        flagReason: lead.flagReason || '',
        source: lead.source || '',
        createdByType: lead.createdByType || 'User',
        qualifiedAt: lead.qualifiedAt || null,
        cashbackPaidAt: lead.cashbackPaidAt || null,
        rewardPaidAt: lead.rewardPaidAt || null,
        createdAt: lead.createdAt || '',
        updatedAt: lead.updatedAt || '',
      },
      link: linkInfo,
      timeline: auditResult.rows.map(r => ({
        eventId: r.autonumber_id != null ? Number(r.autonumber_id) : null,
        action: String(r.action || ''),
        actor: String(r.actor || ''),
        previousValue: String(r.previousValue || ''),
        newValue: String(r.newValue || ''),
        reason: String(r.reason || ''),
        note: String(r.note || ''),
        createdAt: String(r.created_at || ''),
      })),
    };
  },
});
