import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';
import { verifyAdmin } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin paginated referral leads list with multi-filter support',
  inputSchema: z.object({
    password: z.string(),
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(25),
    search: z.string().optional(),
    leadStatus: z.string().optional(),
    cashbackStatus: z.string().optional(),
    rewardStatus: z.string().optional(),
    paymentStatus: z.string().optional(),
    offerName: z.string().optional(),
    referrerName: z.string().optional(),
    flaggedOnly: z.boolean().optional(),
    dateRange: z.enum(['today', 'yesterday', '7d', '30d', 'thisMonth', 'lastMonth', 'all']).optional().default('all'),
    sortBy: z.enum(['newest', 'oldest', 'highestReward', 'lowestReward', 'lastUpdated']).optional().default('newest'),
  }),
  outputSchema: z.object({
    records: z.array(z.object({
      id: z.string(),
      referralId: z.number().nullable(),
      referredUserName: z.string(),
      referredUserIdentifier: z.string(),
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
      flaggedForReview: z.boolean(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    hasMore: z.boolean(),
  }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 0;

    function addParam(val: unknown) { paramIdx++; params.push(val); return `$${paramIdx}`; }

    if (input.search?.trim()) {
      const q = `%${input.search.trim()}%`;
      const p = addParam(q);
      conditions.push(`(
        "referredUserName" ILIKE ${p} OR
        "referredUserIdentifier" ILIKE ${p} OR
        "referrerName" ILIKE ${p} OR
        "referrerUpi" ILIKE ${p} OR
        "offerName" ILIKE ${p} OR
        "referralCode" ILIKE ${p}
      )`);
    }

    if (input.leadStatus) conditions.push(`"leadStatus" = ${addParam(input.leadStatus)}`);
    if (input.cashbackStatus) conditions.push(`"cashbackStatus" = ${addParam(input.cashbackStatus)}`);
    if (input.rewardStatus) conditions.push(`"rewardStatus" = ${addParam(input.rewardStatus)}`);
    if (input.paymentStatus) conditions.push(`"paymentStatus" = ${addParam(input.paymentStatus)}`);
    if (input.offerName) conditions.push(`"offerName" ILIKE ${addParam(`%${input.offerName}%`)}`);
    if (input.referrerName) conditions.push(`"referrerName" ILIKE ${addParam(`%${input.referrerName}%`)}`);
    if (input.flaggedOnly) conditions.push(`"flaggedForReview" = true`);

    if (input.dateRange !== 'all') {
      const dateMap: Record<string, string> = {
        today: `created_at >= CURRENT_DATE`,
        yesterday: `created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE`,
        '7d': `created_at >= NOW() - INTERVAL '7 days'`,
        '30d': `created_at >= NOW() - INTERVAL '30 days'`,
        thisMonth: `created_at >= date_trunc('month', NOW())`,
        lastMonth: `created_at >= date_trunc('month', NOW() - INTERVAL '1 month') AND created_at < date_trunc('month', NOW())`,
      };
      if (dateMap[input.dateRange]) conditions.push(dateMap[input.dateRange]);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderMap: Record<string, string> = {
      newest: 'created_at DESC',
      oldest: 'created_at ASC',
      highestReward: 'COALESCE("rewardAmount", 0) DESC',
      lowestReward: 'COALESCE("rewardAmount", 0) ASC',
      lastUpdated: 'updated_at DESC',
    };
    const orderBy = orderMap[input.sortBy] || 'created_at DESC';
    const offset = (input.page - 1) * input.pageSize;

    const countResult = await zite.sql({
      query: `SELECT COUNT(*) AS c FROM "ReferralLeads" ${where}`,
      params,
    });
    const total = Number(countResult.rows[0]?.c || 0);

    const dataResult = await zite.sql({
      query: `
        SELECT id, autonumber_id, "referredUserName", "referredUserIdentifier",
          "referrerName", "referrerUpi", "offerName", "referralCode",
          "leadStatus", "cashbackStatus", "cashbackAmount", "rewardStatus",
          "rewardAmount", "paymentStatus", "flaggedForReview",
          created_at, updated_at
        FROM "ReferralLeads"
        ${where}
        ORDER BY ${orderBy}
        LIMIT ${input.pageSize} OFFSET ${offset}
      `,
      params,
    });

    return {
      records: dataResult.rows.map(r => ({
        id: String(r.id),
        referralId: r.autonumber_id != null ? Number(r.autonumber_id) : null,
        referredUserName: String(r.referredUserName || ''),
        referredUserIdentifier: String(r.referredUserIdentifier || ''),
        referrerName: String(r.referrerName || ''),
        referrerUpi: String(r.referrerUpi || ''),
        offerName: String(r.offerName || ''),
        referralCode: String(r.referralCode || ''),
        leadStatus: String(r.leadStatus || 'Clicked'),
        cashbackStatus: String(r.cashbackStatus || 'Pending'),
        cashbackAmount: Number(r.cashbackAmount || 0),
        rewardStatus: String(r.rewardStatus || 'Pending'),
        rewardAmount: Number(r.rewardAmount || 0),
        paymentStatus: String(r.paymentStatus || 'Pending'),
        flaggedForReview: r.flaggedForReview === true,
        createdAt: String(r.created_at || ''),
        updatedAt: String(r.updated_at || ''),
      })),
      total,
      page: input.page,
      pageSize: input.pageSize,
      hasMore: offset + input.pageSize < total,
    };
  },
});
