import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';
import { verifyAdmin } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin referrer performance breakdown',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({
    referrers: z.array(z.object({
      referrerName: z.string(),
      referrerUpi: z.string(),
      totalLinks: z.number(),
      activeLinks: z.number(),
      totalClicks: z.number(),
      totalReferrals: z.number(),
      qualified: z.number(),
      completed: z.number(),
      conversionRate: z.number(),
      rewardPending: z.number(),
      rewardPaid: z.number(),
      totalEarnings: z.number(),
    })),
  }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const linkResult = await zite.sql({
      query: `
        SELECT
          COALESCE("referrerUpi", "referrerName") AS "key",
          MAX("referrerName") AS "referrerName",
          MAX("referrerUpi") AS "referrerUpi",
          COUNT(*) AS "totalLinks",
          COUNT(*) FILTER (WHERE "linkStatus" = 'Active') AS "activeLinks",
          COALESCE(SUM("clickCount"), 0) AS "totalClicks"
        FROM "ReferralLinks"
        GROUP BY COALESCE("referrerUpi", "referrerName")
        ORDER BY "totalClicks" DESC
        LIMIT 100
      `,
    });

    const leadResult = await zite.sql({
      query: `
        SELECT
          COALESCE("referrerUpi", "referrerName") AS "key",
          COUNT(*) AS "totalReferrals",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Qualified') AS "qualified",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Completed') AS "completed",
          COALESCE(SUM("rewardAmount") FILTER (WHERE "rewardStatus" IN ('Pending','Eligible','Approved','Processing')), 0) AS "rewardPending",
          COALESCE(SUM("rewardAmount") FILTER (WHERE "rewardStatus" = 'Paid'), 0) AS "rewardPaid"
        FROM "ReferralLeads"
        GROUP BY COALESCE("referrerUpi", "referrerName")
      `,
    });

    const leadMap = new Map<string, typeof leadResult.rows[0]>();
    for (const r of leadResult.rows) leadMap.set(String(r.key), r);

    return {
      referrers: linkResult.rows.map(r => {
        const key = String(r.key);
        const ld = leadMap.get(key);
        const totalRefs = Number(ld?.totalReferrals || 0);
        const clicks = Number(r.totalClicks || 0);
        const rewardPaid = Number(ld?.rewardPaid || 0);
        return {
          referrerName: String(r.referrerName || ''),
          referrerUpi: String(r.referrerUpi || ''),
          totalLinks: Number(r.totalLinks || 0),
          activeLinks: Number(r.activeLinks || 0),
          totalClicks: clicks,
          totalReferrals: totalRefs,
          qualified: Number(ld?.qualified || 0),
          completed: Number(ld?.completed || 0),
          conversionRate: clicks > 0 ? Math.round((totalRefs / clicks) * 100) : 0,
          rewardPending: Number(ld?.rewardPending || 0),
          rewardPaid,
          totalEarnings: rewardPaid,
        };
      }),
    };
  },
});
