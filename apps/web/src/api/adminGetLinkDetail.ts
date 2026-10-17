import { appUrl as getAppUrl } from '@server/context';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';
import { verifyAdmin } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin gets full link detail including performance, referral leads, reward summary, linked leads, and audit timeline',
  inputSchema: z.object({
    password: z.string(),
    linkId: z.string().min(1),
  }),
  outputSchema: z.object({
    link: z.object({
      id: z.string(),
      referrerName: z.string(),
      referrerUpi: z.string(),
      offerName: z.string(),
      offerId: z.string(),
      offerSlug: z.string(),
      referralCode: z.string(),
      linkStatus: z.string(),
      clickCount: z.number(),
      uniqueClickCount: z.number(),
      leadCount: z.number(),
      actualLeadCount: z.number(),
      referrerCut: z.number(),
      userCut: z.number(),
      expiryDate: z.string().nullable(),
      referralLimit: z.number().nullable(),
      createdByType: z.string(),
      internalNote: z.string(),
      customReferrerData: z.string(),
      pausedAt: z.string().nullable(),
      pauseReason: z.string(),
      terminatedAt: z.string().nullable(),
      terminateReason: z.string(),
      revokedAt: z.string().nullable(),
      revokeReason: z.string(),
      resumedAt: z.string().nullable(),
      createdAt: z.string(),
      lastActivityAt: z.string().nullable(),
    }),
    performance: z.object({
      clicks: z.number(),
      uniqueClicks: z.number(),
      leads: z.number(),
      qualified: z.number(),
      completed: z.number(),
      rejected: z.number(),
      submitted: z.number(),
      underReview: z.number(),
      conversionRate: z.number(),
    }),
    rewardSummary: z.object({
      totalReward: z.number(),
      totalCashback: z.number(),
      pending: z.number(),
      eligible: z.number(),
      approved: z.number(),
      paid: z.number(),
      failed: z.number(),
    }),
    referrals: z.array(z.object({
      id: z.string(),
      referredUserName: z.string(),
      referredUserIdentifier: z.string(),
      leadStatus: z.string(),
      cashbackStatus: z.string(),
      cashbackAmount: z.number(),
      rewardStatus: z.string(),
      rewardAmount: z.number(),
      createdAt: z.string(),
    })),
    linkedLeads: z.array(z.object({
      id: z.string(),
      leadId: z.string(),
      userName: z.string(),
      userUpi: z.string(),
      offerName: z.string(),
      status: z.string(),
      offerPayout: z.number(),
      payoutStatus: z.string(),
      userGot: z.number(),
      createdAt: z.string(),
    })),
    timeline: z.array(z.object({
      action: z.string(),
      actor: z.string(),
      previousValue: z.string(),
      newValue: z.string(),
      reason: z.string(),
      createdAt: z.string(),
    })),
    offerLink: z.string(),
    dashboardLink: z.string(),
  }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const link = await db.referralLinks.findOne({ id: input.linkId });
    if (!link) throw new ApiError({ code: 'NOT_FOUND', message: 'Link not found' });

    const appUrl = getAppUrl();

    // Get referral leads for this link
    const leadsResult = await db.sql({
      query: `
        SELECT id, "referredUserName", "referredUserIdentifier", "leadStatus", "cashbackStatus",
          "cashbackAmount", "rewardStatus", "rewardAmount", created_at
        FROM "ReferralLeads"
        WHERE "referralLinkId" = $1
        ORDER BY created_at DESC
        LIMIT 200
      `,
      params: [input.linkId],
    });

    // Performance aggregates from ReferralLeads
    const perfResult = await db.sql({
      query: `
        SELECT
          COUNT(*) AS "leads",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Qualified') AS "qualified",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Completed') AS "completed",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Rejected' OR "leadStatus" = 'Not Qualified') AS "rejected",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Submitted') AS "submitted",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Under Review') AS "underReview",
          COALESCE(SUM("rewardAmount"), 0) AS "totalReward",
          COALESCE(SUM("cashbackAmount"), 0) AS "totalCashback",
          COUNT(*) FILTER (WHERE "rewardStatus" = 'Pending') AS "rewardPending",
          COUNT(*) FILTER (WHERE "rewardStatus" = 'Eligible') AS "rewardEligible",
          COUNT(*) FILTER (WHERE "rewardStatus" = 'Approved') AS "rewardApproved",
          COUNT(*) FILTER (WHERE "rewardStatus" = 'Paid') AS "rewardPaid",
          COUNT(*) FILTER (WHERE "rewardStatus" = 'Failed') AS "rewardFailed"
        FROM "ReferralLeads"
        WHERE "referralLinkId" = $1
      `,
      params: [input.linkId],
    });
    const p = perfResult.rows[0] || {};
    const actualLeads = Number(p.leads || 0);
    const clicks = link.clickCount || 0;

    // Sync leadCount if out of sync
    if ((link.leadCount || 0) !== actualLeads) {
      db.referralLinks.update({ id: input.linkId, record: { leadCount: actualLeads } }).catch(() => {});
    }

    // Get linked leads from Leads table matched by referralCode
    const linkedLeadsResult = link.referralCode ? await db.sql({
      query: `
        SELECT id, "leadId", "leadData", "offerName", status, "offerPayout", "actionConfig", created_at
        FROM "Leads"
        WHERE "referralCode" = $1
        ORDER BY created_at DESC
        LIMIT 200
      `,
      params: [link.referralCode],
    }) : { rows: [] };

    // Audit timeline
    const auditResult = await db.sql({
      query: `
        SELECT "action", "actor", "previousValue", "newValue", "reason", created_at
        FROM "ReferralAuditLog"
        WHERE "entityId" = $1
        ORDER BY created_at ASC
      `,
      params: [input.linkId],
    });

    const linkedLeads = linkedLeadsResult.rows.map(r => {
      let userName = '—', userUpi = '';
      try {
        const ld = JSON.parse(String(r.leadData || '{}'));
        const entries = Array.isArray(ld) ? ld : Object.entries(ld).map(([k, v]) => ({ label: k, value: v }));
        for (const e of entries) {
          const lbl = String((e as { label?: string }).label || '').toLowerCase();
          if (lbl.includes('name') && userName === '—') userName = String((e as { value?: string }).value || '—');
          if (lbl.includes('upi')) userUpi = String((e as { value?: string }).value || '');
        }
      } catch {}
      let payoutStatus = 'Pending', userGot = 0;
      try {
        const ac = JSON.parse(String(r.actionConfig || '{}'));
        if (ac._trashed === true) return null; // skip trashed
        if (ac.payoutStatus) payoutStatus = ac.payoutStatus;
        else if (ac.userGot && Number(ac.userGot) > 0) payoutStatus = 'Paid';
        userGot = Number(ac.userGot || 0);
      } catch {}
      return {
        id: String(r.id),
        leadId: String(r.leadId || ''),
        userName,
        userUpi,
        offerName: String(r.offerName || ''),
        status: String(r.status || 'Pending'),
        offerPayout: Number(r.offerPayout || 0),
        payoutStatus,
        userGot,
        createdAt: String(r.created_at || ''),
      };
    }).filter(Boolean) as { id: string; leadId: string; userName: string; userUpi: string; offerName: string; status: string; offerPayout: number; payoutStatus: string; userGot: number; createdAt: string }[];

    return {
      link: {
        id: link.id,
        referrerName: link.referrerName || '',
        referrerUpi: link.referrerUpi || '',
        offerName: link.offerName || '',
        offerId: link.offerId || '',
        offerSlug: link.offerSlug || '',
        referralCode: link.referralCode || '',
        linkStatus: link.linkStatus || 'Active',
        clickCount: link.clickCount || 0,
        uniqueClickCount: link.uniqueClickCount || 0,
        leadCount: link.leadCount || 0,
        actualLeadCount: actualLeads,
        referrerCut: link.referrerCut || 0,
        userCut: link.userCut || 0,
        expiryDate: link.expiryDate || null,
        referralLimit: link.referralLimit ?? null,
        createdByType: link.createdByType || 'User',
        internalNote: link.internalNote || '',
        customReferrerData: link.customReferrerData || '{}',
        pausedAt: link.pausedAt || null,
        pauseReason: link.pauseReason || '',
        terminatedAt: link.terminatedAt || null,
        terminateReason: link.terminateReason || '',
        revokedAt: link.revokedAt || null,
        revokeReason: link.revokeReason || '',
        resumedAt: link.resumedAt || null,
        createdAt: link.createdAt || '',
        lastActivityAt: link.lastActivityAt || null,
      },
      performance: {
        clicks,
        uniqueClicks: link.uniqueClickCount || 0,
        leads: actualLeads,
        qualified: Number(p.qualified || 0),
        completed: Number(p.completed || 0),
        rejected: Number(p.rejected || 0),
        submitted: Number(p.submitted || 0),
        underReview: Number(p.underReview || 0),
        conversionRate: clicks > 0 ? Math.round((actualLeads / clicks) * 100) : 0,
      },
      rewardSummary: {
        totalReward: Number(p.totalReward || 0),
        totalCashback: Number(p.totalCashback || 0),
        pending: Number(p.rewardPending || 0),
        eligible: Number(p.rewardEligible || 0),
        approved: Number(p.rewardApproved || 0),
        paid: Number(p.rewardPaid || 0),
        failed: Number(p.rewardFailed || 0),
      },
      referrals: leadsResult.rows.map(r => ({
        id: String(r.id),
        referredUserName: String(r.referredUserName || ''),
        referredUserIdentifier: String(r.referredUserIdentifier || ''),
        leadStatus: String(r.leadStatus || 'Clicked'),
        cashbackStatus: String(r.cashbackStatus || 'Pending'),
        cashbackAmount: Number(r.cashbackAmount || 0),
        rewardStatus: String(r.rewardStatus || 'Pending'),
        rewardAmount: Number(r.rewardAmount || 0),
        createdAt: String(r.created_at || ''),
      })),
      linkedLeads,
      timeline: auditResult.rows.map(r => ({
        action: String(r.action || ''),
        actor: String(r.actor || ''),
        previousValue: String(r.previousValue || ''),
        newValue: String(r.newValue || ''),
        reason: String(r.reason || ''),
        createdAt: String(r.created_at || ''),
      })),
      offerLink: `${appUrl}/offer/${link.offerSlug || ''}`,
      dashboardLink: `${appUrl}/refer/track/${link.referralCode || ''}`,
    };
  },
});
