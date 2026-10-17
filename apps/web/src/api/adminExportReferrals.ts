import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';
import { verifyAdmin } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin exports referral records as CSV-ready data with current filters',
  inputSchema: z.object({
    password: z.string(),
    leadStatus: z.string().optional(),
    cashbackStatus: z.string().optional(),
    rewardStatus: z.string().optional(),
    offerName: z.string().optional(),
    referrerName: z.string().optional(),
    dateRange: z.enum(['today', '7d', '30d', 'all']).optional().default('all'),
  }),
  outputSchema: z.object({
    rows: z.array(z.object({
      referralId: z.number().nullable(),
      referredUserName: z.string(),
      referrerName: z.string(),
      referrerUpi: z.string(),
      offerName: z.string(),
      referralCode: z.string(),
      leadStatus: z.string(),
      cashbackStatus: z.string(),
      cashbackAmount: z.number(),
      rewardStatus: z.string(),
      rewardAmount: z.number(),
      paymentStatus: z.string(),
      createdAt: z.string(),
      qualifiedAt: z.string(),
      cashbackPaidAt: z.string(),
      rewardPaidAt: z.string(),
      updatedAt: z.string(),
      rejectionReason: z.string(),
    })),
    count: z.number(),
  }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 0;
    function addP(val: unknown) { idx++; params.push(val); return `$${idx}`; }

    if (input.leadStatus) conditions.push(`"leadStatus" = ${addP(input.leadStatus)}`);
    if (input.cashbackStatus) conditions.push(`"cashbackStatus" = ${addP(input.cashbackStatus)}`);
    if (input.rewardStatus) conditions.push(`"rewardStatus" = ${addP(input.rewardStatus)}`);
    if (input.offerName) conditions.push(`"offerName" ILIKE ${addP(`%${input.offerName}%`)}`);
    if (input.referrerName) conditions.push(`"referrerName" ILIKE ${addP(`%${input.referrerName}%`)}`);
    if (input.dateRange !== 'all') {
      const dm: Record<string, string> = {
        today: `created_at >= CURRENT_DATE`,
        '7d': `created_at >= NOW() - INTERVAL '7 days'`,
        '30d': `created_at >= NOW() - INTERVAL '30 days'`,
      };
      if (dm[input.dateRange]) conditions.push(dm[input.dateRange]);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.sql({
      query: `
        SELECT autonumber_id, "referredUserName", "referrerName", "referrerUpi",
          "offerName", "referralCode", "leadStatus", "cashbackStatus", "cashbackAmount",
          "rewardStatus", "rewardAmount", "paymentStatus", created_at, updated_at,
          "qualifiedAt", "cashbackPaidAt", "rewardPaidAt", "rejectionReason"
        FROM "ReferralLeads"
        ${where}
        ORDER BY created_at DESC
        LIMIT 2000
      `,
      params,
    });

    return {
      rows: result.rows.map(r => ({
        referralId: r.autonumber_id != null ? Number(r.autonumber_id) : null,
        referredUserName: String(r.referredUserName || ''),
        referrerName: String(r.referrerName || ''),
        referrerUpi: String(r.referrerUpi || ''),
        offerName: String(r.offerName || ''),
        referralCode: String(r.referralCode || ''),
        leadStatus: String(r.leadStatus || ''),
        cashbackStatus: String(r.cashbackStatus || ''),
        cashbackAmount: Number(r.cashbackAmount || 0),
        rewardStatus: String(r.rewardStatus || ''),
        rewardAmount: Number(r.rewardAmount || 0),
        paymentStatus: String(r.paymentStatus || ''),
        createdAt: String(r.created_at || ''),
        qualifiedAt: String(r.qualifiedAt || ''),
        cashbackPaidAt: String(r.cashbackPaidAt || ''),
        rewardPaidAt: String(r.rewardPaidAt || ''),
        updatedAt: String(r.updated_at || ''),
        rejectionReason: String(r.rejectionReason || ''),
      })),
      count: result.rows.length,
    };
  },
});
