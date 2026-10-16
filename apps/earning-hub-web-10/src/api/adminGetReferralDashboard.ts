import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';
import { verifyAdmin } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin referral dashboard — metrics, funnel, needs attention, financial summary',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({
    metrics: z.object({
      totalReferrals: z.number(),
      newReferrals: z.number(),
      activeReferrals: z.number(),
      pending: z.number(),
      qualified: z.number(),
      completed: z.number(),
      rejected: z.number(),
      cancelled: z.number(),
      rewardPending: z.number(),
      rewardApproved: z.number(),
      rewardPaid: z.number(),
      totalEarnings: z.number(),
      conversionRate: z.number(),
    }),
    funnel: z.array(z.object({ stage: z.string(), count: z.number() })),
    needsAttention: z.number(),
    financials: z.object({
      totalCashback: z.number(),
      cashbackPaid: z.number(),
      cashbackPending: z.number(),
      totalReward: z.number(),
      rewardPaid: z.number(),
      rewardPending: z.number(),
    }),
  }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const metricsResult = await zite.sql({
      query: `
        SELECT
          COUNT(*) AS "total",
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS "newReferrals",
          COUNT(*) FILTER (WHERE "leadStatus" IN ('Clicked','Offer Opened','Registered','Submitted','Under Review','Action Required','Qualified')) AS "activeReferrals",
          COUNT(*) FILTER (WHERE "leadStatus" IN ('Submitted','Under Review','Action Required')) AS "pending",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Qualified') AS "qualified",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Completed') AS "completed",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Rejected') AS "rejected",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Cancelled') AS "cancelled",
          COUNT(*) FILTER (WHERE "rewardStatus" = 'Pending') AS "rewardPending",
          COUNT(*) FILTER (WHERE "rewardStatus" = 'Approved') AS "rewardApproved",
          COUNT(*) FILTER (WHERE "rewardStatus" = 'Paid') AS "rewardPaid",
          COALESCE(SUM("rewardAmount") FILTER (WHERE "rewardStatus" = 'Paid'), 0) AS "totalEarnings",
          COALESCE(SUM("cashbackAmount"), 0) AS "totalCashback",
          COALESCE(SUM("cashbackAmount") FILTER (WHERE "cashbackStatus" = 'Paid'), 0) AS "cashbackPaid",
          COALESCE(SUM("cashbackAmount") FILTER (WHERE "cashbackStatus" IN ('Pending','Processing','Approved')), 0) AS "cashbackPending",
          COALESCE(SUM("rewardAmount"), 0) AS "totalReward",
          COALESCE(SUM("rewardAmount") FILTER (WHERE "rewardStatus" = 'Paid'), 0) AS "rewardPaidAmt",
          COALESCE(SUM("rewardAmount") FILTER (WHERE "rewardStatus" IN ('Pending','Eligible','Approved','Processing')), 0) AS "rewardPendingAmt",
          COUNT(*) FILTER (WHERE "flaggedForReview" = true) AS "flagged",
          COUNT(*) FILTER (WHERE "cashbackStatus" = 'Paid') AS "cashbackPaidCount",
          COUNT(*) FILTER (WHERE "rewardStatus" = 'Paid') AS "rewardPaidCount"
        FROM "ReferralLeads"
      `,
    });

    const m = metricsResult.rows[0] || {};
    const total = Number(m.total || 0);
    const completed = Number(m.completed || 0);

    const funnelResult = await zite.sql({
      query: `
        SELECT
          COALESCE(SUM("clickCount"), 0) AS "clicks",
          COALESCE(SUM("uniqueClickCount"), 0) AS "uniqueClicks",
          COALESCE(SUM("leadCount"), 0) AS "leads"
        FROM "ReferralLinks"
      `,
    });
    const f = funnelResult.rows[0] || {};

    const stageResult = await zite.sql({
      query: `
        SELECT "leadStatus", COUNT(*) AS c
        FROM "ReferralLeads"
        GROUP BY "leadStatus"
      `,
    });
    const stageMap: Record<string, number> = {};
    for (const r of stageResult.rows) {
      stageMap[String(r.leadStatus || 'Unknown')] = Number(r.c || 0);
    }

    const funnel = [
      { stage: 'Link Clicked', count: Number(f.clicks || 0) },
      { stage: 'Registered', count: stageMap['Registered'] || 0 },
      { stage: 'Lead Submitted', count: (stageMap['Submitted'] || 0) + (stageMap['Under Review'] || 0) + (stageMap['Action Required'] || 0) + (stageMap['Qualified'] || 0) + (stageMap['Completed'] || 0) },
      { stage: 'Qualified', count: (stageMap['Qualified'] || 0) + (stageMap['Completed'] || 0) },
      { stage: 'Completed', count: stageMap['Completed'] || 0 },
      { stage: 'Cashback Paid', count: Number(m.cashbackPaidCount || 0) },
      { stage: 'Reward Paid', count: Number(m.rewardPaidCount || 0) },
    ];

    return {
      metrics: {
        totalReferrals: total,
        newReferrals: Number(m.newReferrals || 0),
        activeReferrals: Number(m.activeReferrals || 0),
        pending: Number(m.pending || 0),
        qualified: Number(m.qualified || 0),
        completed,
        rejected: Number(m.rejected || 0),
        cancelled: Number(m.cancelled || 0),
        rewardPending: Number(m.rewardPending || 0),
        rewardApproved: Number(m.rewardApproved || 0),
        rewardPaid: Number(m.rewardPaid || 0),
        totalEarnings: Number(m.totalEarnings || 0),
        conversionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      funnel,
      needsAttention: Number(m.flagged || 0) + Number(m.pending || 0),
      financials: {
        totalCashback: Number(m.totalCashback || 0),
        cashbackPaid: Number(m.cashbackPaid || 0),
        cashbackPending: Number(m.cashbackPending || 0),
        totalReward: Number(m.totalReward || 0),
        rewardPaid: Number(m.rewardPaidAmt || 0),
        rewardPending: Number(m.rewardPendingAmt || 0),
      },
    };
  },
});
