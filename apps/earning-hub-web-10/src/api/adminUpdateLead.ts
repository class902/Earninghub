import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: update lead — status, data, remark, note, action config; tracks status history & auto-sets paidDate',
  inputSchema: z.object({
    password: z.string(),
    id: z.string(),
    status: z.string().optional(),
    publicRemark: z.string().optional(),
    internalNote: z.string().optional(),
    leadData: z.string().optional(),
    offerName: z.string().optional(),
    offerPayout: z.number().optional(),
    summary: z.string().optional(),
    actionConfig: z.string().optional(), // JSON — merged with existing; can include paidDate, buttonLabel, etc.
    // Lead source reclassification fields
    createdByType: z.enum(['User', 'Admin', 'Referral']).optional(),
    isReferralLead: z.boolean().optional(),
    referralCode: z.string().optional(),
    referralLinkId: z.string().optional(),
    // When reclassifying to Referral, optionally link by referrer UPI
    referrerUpi: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    // Fetch current record so we can merge actionConfig + append status history
    const current = await zite.leads.findOne({ id: input.id });

    const updateRecord: Record<string, unknown> = {};
    if (input.status !== undefined) updateRecord.status = input.status;
    if (input.publicRemark !== undefined) updateRecord.publicRemark = input.publicRemark;
    if (input.internalNote !== undefined) updateRecord.internalNote = input.internalNote;
    if (input.offerName !== undefined) updateRecord.offerName = input.offerName;
    if (input.offerPayout !== undefined) updateRecord.offerPayout = input.offerPayout;
    if (input.summary !== undefined) updateRecord.summary = input.summary;

    // ── Lead source reclassification ──
    if (input.createdByType !== undefined) updateRecord.createdByType = input.createdByType;
    if (input.isReferralLead !== undefined) updateRecord.isReferralLead = input.isReferralLead;
    if (input.referralCode !== undefined) updateRecord.referralCode = input.referralCode;
    if (input.referralLinkId !== undefined) updateRecord.referralLinkId = input.referralLinkId;

    // ── Merge actionConfig, track history, auto-set paidDate ──
    let ac: Record<string, unknown> = {};
    try { if (current?.actionConfig) ac = JSON.parse(current.actionConfig); } catch {}

    // Merge incoming actionConfig fields (preserves existing keys not in newAc)
    if (input.actionConfig) {
      try {
        const newAc = JSON.parse(input.actionConfig);
        ac = { ...ac, ...newAc };
      } catch {}
    }

    // Append status history when status changes
    const prevStatus = current?.status;
    if (input.status !== undefined && prevStatus !== input.status) {
      const history: Array<{ status: string; date: string }> = Array.isArray(ac.statusHistory)
        ? (ac.statusHistory as Array<{ status: string; date: string }>)
        : [];
      // Seed history with initial status if first change
      if (history.length === 0 && prevStatus) {
        history.push({ status: prevStatus, date: current?.createdAt || new Date().toISOString() });
      }
      history.push({ status: input.status, date: new Date().toISOString() });
      ac.statusHistory = history;
    }

    // Auto-set paidDate when marking Cashback Sent/Paid/Approved (if not already set by admin)
    const isPaid = input.status === 'Paid' || input.status === 'Cashback Sent';
    if (isPaid && !ac.paidDate) {
      ac.paidDate = new Date().toISOString();
    }
    // Never auto-wipe submissionDate when status changes

    updateRecord.actionConfig = JSON.stringify(ac);

    if (input.leadData !== undefined) {
      updateRecord.leadData = input.leadData;
      if (input.summary === undefined) {
        try {
          const data = JSON.parse(input.leadData);
          const upiEntry = Object.entries(data).find(([k]) => k.toLowerCase().includes('upi'));
          if (upiEntry) updateRecord.summary = String(upiEntry[1]);
          else {
            const nameEntry = Object.entries(data).find(([k]) => k.toLowerCase().includes('name'));
            if (nameEntry) updateRecord.summary = String(nameEntry[1]);
          }
        } catch {}
      }
    }

    await zite.leads.update({ id: input.id, record: updateRecord });

    // ── Create ReferralLeads record when reclassifying to Referral ──
    if (input.createdByType === 'Referral' && input.isReferralLead === true && input.referrerUpi) {
      // Check if a ReferralLeads record already exists for this lead
      const existingRefLead = await zite.referralLeads.findOne({ filters: { leadId: current?.leadId || '' } });
      if (!existingRefLead) {
        // Look up referral link by referrer UPI to get context
        let refLinkRecord = input.referralLinkId
          ? await zite.referralLinks.findOne({ id: input.referralLinkId })
          : null;
        if (!refLinkRecord && input.referrerUpi) {
          refLinkRecord = await zite.referralLinks.findOne({ filters: { referrerUpi: input.referrerUpi } });
        }

        // Parse lead data for user details
        let referredName = '';
        let referredIdentifier = '';
        try {
          const ld = JSON.parse(current?.leadData || '{}');
          const nameEntry = Object.entries(ld).find(([k]) => k.toLowerCase().includes('name'));
          const upiEntry = Object.entries(ld).find(([k]) => k.toLowerCase().includes('upi'));
          if (nameEntry) referredName = String(nameEntry[1]);
          if (upiEntry) referredIdentifier = String(upiEntry[1]);
        } catch {}

        await zite.referralLeads.create({
          record: {
            referredUserName: referredName,
            referredUserIdentifier: referredIdentifier,
            referrerName: refLinkRecord?.referrerName || '',
            referrerUpi: input.referrerUpi,
            offerName: current?.offerName || input.offerName || '',
            offerId: refLinkRecord?.offerId || null,
            leadId: current?.leadId || '',
            referralLinkId: refLinkRecord?.id || input.referralLinkId || '',
            referralCode: input.referralCode || refLinkRecord?.referralCode || '',
            leadStatus: 'Submitted',
            cashbackStatus: 'Pending',
            cashbackAmount: null,
            rewardStatus: 'Pending',
            rewardAmount: null,
            paymentStatus: 'Pending',
            publicRemark: null,
            internalNote: 'Reclassified by admin',
            qualifiedAt: null,
            cashbackPaidAt: null,
            rewardPaidAt: null,
            rejectionReason: null,
            source: 'admin_reclassification',
            createdByType: 'Admin',
            flaggedForReview: false,
            flagReason: null,
          },
        });
      }
    }

    return { success: true };
  },
});
