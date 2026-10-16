import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';
import { verifyAdmin } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin offer-level referral performance breakdown',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({
    offers: z.array(z.object({
      offerName: z.string(),
      generatedLinks: z.number(),
      clicks: z.number(),
      leads: z.number(),
      qualified: z.number(),
      completed: z.number(),
      conversionRate: z.number(),
      cashbackPaid: z.number(),
      rewardPaid: z.number(),
      rewardPending: z.number(),
      rejected: z.number(),
    })),
  }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const linkResult = await zite.sql({
      query: `
        SELECT "offerName",
          COUNT(*) AS "generatedLinks",
          COALESCE(SUM("clickCount"), 0) AS "clicks"
        FROM "ReferralLinks"
        GROUP BY "offerName"
        ORDER BY "clicks" DESC
      `,
    });

    const leadResult = await zite.sql({
      query: `
        SELECT "offerName",
          COUNT(*) AS "leads",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Qualified') AS "qualified",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Completed') AS "completed",
          COUNT(*) FILTER (WHERE "leadStatus" = 'Rejected') AS "rejected",
          COALESCE(SUM("cashbackAmount") FILTER (WHERE "cashbackStatus" = 'Paid'), 0) AS "cashbackPaid",
          COALESCE(SUM("rewardAmount") FILTER (WHERE "rewardStatus" = 'Paid'), 0) AS "rewardPaid",
          COALESCE(SUM("rewardAmount") FILTER (WHERE "rewardStatus" IN ('Pending','Eligible','Approved','Processing')), 0) AS "rewardPending"
        FROM "ReferralLeads"
        GROUP BY "offerName"
      `,
    });

    const leadMap = new Map<string, typeof leadResult.rows[0]>();
    for (const r of leadResult.rows) leadMap.set(String(r.offerName), r);

    return {
      offers: linkResult.rows.map(r => {
        const name = String(r.offerName || '');
        const ld = leadMap.get(name);
        const clicks = Number(r.clicks || 0);
        const leads = Number(ld?.leads || 0);
        return {
          offerName: name,
          generatedLinks: Number(r.generatedLinks || 0),
          clicks,
          leads,
          qualified: Number(ld?.qualified || 0),
          completed: Number(ld?.completed || 0),
          conversionRate: clicks > 0 ? Math.round((leads / clicks) * 100) : 0,
          cashbackPaid: Number(ld?.cashbackPaid || 0),
          rewardPaid: Number(ld?.rewardPaid || 0),
          rewardPending: Number(ld?.rewardPending || 0),
          rejected: Number(ld?.rejected || 0),
        };
      }),
    };
  },
});
