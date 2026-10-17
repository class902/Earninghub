import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';
import { verifyAdmin } from '../lib/referralUtils';

export default createEndpoint({
  description: 'Admin upgraded generated links dashboard with lifecycle metrics and conversion stats',
  inputSchema: z.object({
    password: z.string(),
    page: z.number().optional().default(1),
    pageSize: z.number().optional().default(25),
    search: z.string().optional(),
    linkStatus: z.string().optional(),
    offerName: z.string().optional(),
    referrerUpi: z.string().optional(),
    dateRange: z.enum(['today', '7d', '30d', 'all']).optional().default('all'),
    sortBy: z.enum(['newest', 'oldest', 'mostClicks', 'mostReferrals', 'highestConversion']).optional().default('newest'),
  }),
  outputSchema: z.object({
    links: z.array(z.object({
      id: z.string(),
      referrerName: z.string(),
      referrerUpi: z.string(),
      offerName: z.string(),
      referralCode: z.string(),
      linkStatus: z.string(),
      clickCount: z.number(),
      uniqueClickCount: z.number(),
      leadCount: z.number(),
      referrerCut: z.number(),
      userCut: z.number(),
      expiryDate: z.string().nullable(),
      createdByType: z.string(),
      createdAt: z.string(),
      lastActivityAt: z.string().nullable(),
    })),
    stats: z.object({
      total: z.number(),
      active: z.number(),
      paused: z.number(),
      expired: z.number(),
      terminated: z.number(),
      revoked: z.number(),
      totalClicks: z.number(),
      uniqueClicks: z.number(),
      totalLeads: z.number(),
      uniqueReferrers: z.number(),
      uniqueOffers: z.number(),
      expiringSoon: z.number(),
    }),
    total: z.number(),
    page: z.number(),
    hasMore: z.boolean(),
  }),
  execute: async ({ input }) => {
    verifyAdmin(input.password);

    // Stats from all links
    const statsResult = await db.sql({
      query: `
        SELECT
          COUNT(*) AS "total",
          COUNT(*) FILTER (WHERE "linkStatus" = 'Active') AS "active",
          COUNT(*) FILTER (WHERE "linkStatus" = 'Paused') AS "paused",
          COUNT(*) FILTER (WHERE "linkStatus" = 'Expired') AS "expired",
          COUNT(*) FILTER (WHERE "linkStatus" = 'Terminated') AS "terminated",
          COUNT(*) FILTER (WHERE "linkStatus" = 'Revoked') AS "revoked",
          COALESCE(SUM("clickCount"), 0) AS "totalClicks",
          COALESCE(SUM("uniqueClickCount"), 0) AS "uniqueClicks",
          COALESCE(SUM("leadCount"), 0) AS "totalLeads",
          COUNT(DISTINCT "referrerUpi") AS "uniqueReferrers",
          COUNT(DISTINCT "offerName") AS "uniqueOffers",
          COUNT(*) FILTER (WHERE "linkStatus" = 'Active' AND "expiryDate" IS NOT NULL AND "expiryDate" <= NOW() + INTERVAL '7 days' AND "expiryDate" > NOW()) AS "expiringSoon"
        FROM "ReferralLinks"
      `,
    });
    const s = statsResult.rows[0] || {};

    // Filtered + paginated links
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 0;
    function addP(val: unknown) { idx++; params.push(val); return `$${idx}`; }

    if (input.search?.trim()) {
      const q = `%${input.search.trim()}%`;
      const p = addP(q);
      conditions.push(`("referrerName" ILIKE ${p} OR "referrerUpi" ILIKE ${p} OR "offerName" ILIKE ${p} OR "referralCode" ILIKE ${p})`);
    }
    if (input.linkStatus === 'ExpiringSoon') {
      conditions.push(`"linkStatus" = 'Active' AND "expiryDate" IS NOT NULL AND "expiryDate" <= NOW() + INTERVAL '7 days' AND "expiryDate" > NOW()`);
    } else if (input.linkStatus) conditions.push(`"linkStatus" = ${addP(input.linkStatus)}`);
    if (input.offerName) conditions.push(`"offerName" ILIKE ${addP(`%${input.offerName}%`)}`);
    if (input.referrerUpi) conditions.push(`"referrerUpi" ILIKE ${addP(`%${input.referrerUpi}%`)}`);
    if (input.dateRange !== 'all') {
      const dm: Record<string, string> = {
        today: `created_at >= CURRENT_DATE`,
        '7d': `created_at >= NOW() - INTERVAL '7 days'`,
        '30d': `created_at >= NOW() - INTERVAL '30 days'`,
      };
      if (dm[input.dateRange]) conditions.push(dm[input.dateRange]);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderMap: Record<string, string> = {
      newest: 'created_at DESC',
      oldest: 'created_at ASC',
      mostClicks: 'COALESCE("clickCount", 0) DESC',
      mostReferrals: 'COALESCE("leadCount", 0) DESC',
      highestConversion: 'CASE WHEN COALESCE("clickCount",0)>0 THEN COALESCE("leadCount",0)::float/COALESCE("clickCount",1) ELSE 0 END DESC',
    };
    const offset = (input.page - 1) * input.pageSize;

    const countResult = await db.sql({ query: `SELECT COUNT(*) AS c FROM "ReferralLinks" ${where}`, params });
    const total = Number(countResult.rows[0]?.c || 0);

    const dataResult = await db.sql({
      query: `
        SELECT id, "referrerName", "referrerUpi", "offerName", "referralCode",
          "linkStatus", "clickCount", "uniqueClickCount", "leadCount",
          "referrerCut", "userCut", "expiryDate", "createdByType",
          created_at, "lastActivityAt"
        FROM "ReferralLinks"
        ${where}
        ORDER BY ${orderMap[input.sortBy] || 'created_at DESC'}
        LIMIT ${input.pageSize} OFFSET ${offset}
      `,
      params,
    });

    return {
      links: dataResult.rows.map(r => ({
        id: String(r.id),
        referrerName: String(r.referrerName || ''),
        referrerUpi: String(r.referrerUpi || ''),
        offerName: String(r.offerName || ''),
        referralCode: String(r.referralCode || ''),
        linkStatus: String(r.linkStatus || 'Active'),
        clickCount: Number(r.clickCount || 0),
        uniqueClickCount: Number(r.uniqueClickCount || 0),
        leadCount: Number(r.leadCount || 0),
        referrerCut: Number(r.referrerCut || 0),
        userCut: Number(r.userCut || 0),
        expiryDate: r.expiryDate ? String(r.expiryDate) : null,
        createdByType: String(r.createdByType || 'User'),
        createdAt: String(r.created_at || ''),
        lastActivityAt: r.lastActivityAt ? String(r.lastActivityAt) : null,
      })),
      stats: {
        total: Number(s.total || 0),
        active: Number(s.active || 0),
        paused: Number(s.paused || 0),
        expired: Number(s.expired || 0),
        terminated: Number(s.terminated || 0),
        revoked: Number(s.revoked || 0),
        totalClicks: Number(s.totalClicks || 0),
        uniqueClicks: Number(s.uniqueClicks || 0),
        totalLeads: Number(s.totalLeads || 0),
        uniqueReferrers: Number(s.uniqueReferrers || 0),
        uniqueOffers: Number(s.uniqueOffers || 0),
        expiringSoon: Number(s.expiringSoon || 0),
      },
      total,
      page: input.page,
      hasMore: offset + input.pageSize < total,
    };
  },
});
