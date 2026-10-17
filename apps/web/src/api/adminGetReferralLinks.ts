import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

const linkSchema = z.object({
  id: z.string(),
  referrerName: z.string(),
  offerName: z.string(),
  offerSlug: z.string(),
  referralCode: z.string(),
  customReferrerData: z.string(),
  linkStatus: z.string(),
  clickCount: z.number(),
  referrerSplit: z.string(),
  referrerUpi: z.string(),
  createdAt: z.string(),
});

export default createEndpoint({
  description: 'Admin: get all generated referral links with stats and advanced filters',
  inputSchema: z.object({
    password: z.string(),
    offerName: z.string().optional(),
    status: z.enum(['all', 'Active', 'Revoked']).optional().default('all'),
    referrerUpi: z.string().optional(),
    dateRange: z.enum(['today', '7d', '30d', 'all']).optional().default('all'),
  }),
  outputSchema: z.object({
    links: z.array(linkSchema),
    stats: z.object({
      total: z.number(),
      active: z.number(),
      revoked: z.number(),
      totalClicks: z.number(),
      uniqueOffers: z.number(),
      uniqueUPIs: z.number(),
    }),
    upiBreakdown: z.array(z.object({
      upi: z.string(),
      count: z.number(),
      clicks: z.number(),
      offers: z.array(z.string()),
    })),
    offerBreakdown: z.array(z.object({
      offerName: z.string(),
      count: z.number(),
      clicks: z.number(),
      active: z.number(),
    })),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    const { records } = await db.referralLinks.findAll({ limit: 2000 });
    records.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Date range filter
    let dateFiltered = records;
    if (input.dateRange && input.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (input.dateRange === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (input.dateRange === '7d') cutoff.setDate(now.getDate() - 7);
      else if (input.dateRange === '30d') cutoff.setDate(now.getDate() - 30);
      dateFiltered = records.filter(r => r.createdAt && new Date(r.createdAt) >= cutoff);
    }

    let filtered = dateFiltered;
    if (input.offerName && input.offerName.trim()) {
      const q = input.offerName.toLowerCase();
      filtered = filtered.filter(r => r.offerName?.toLowerCase().includes(q));
    }
    if (input.status !== 'all') {
      filtered = filtered.filter(r => r.linkStatus === input.status);
    }
    if (input.referrerUpi && input.referrerUpi.trim()) {
      const q = input.referrerUpi.toLowerCase();
      filtered = filtered.filter(r => (r.referrerUpi || '').toLowerCase().includes(q));
    }

    // Stats from ALL records (not date-filtered)
    const active = records.filter(r => r.linkStatus !== 'Revoked').length;
    const revoked = records.filter(r => r.linkStatus === 'Revoked').length;
    const totalClicks = records.reduce((sum, r) => sum + (r.clickCount || 0), 0);
    const uniqueOffers = new Set(records.map(r => r.offerName)).size;
    const uniqueUPIs = new Set(records.map(r => r.referrerUpi).filter(Boolean)).size;

    // UPI breakdown from all records
    const upiMap = new Map<string, { count: number; clicks: number; offers: Set<string> }>();
    for (const r of records) {
      const upi = r.referrerUpi || r.referrerName || 'Unknown';
      if (!upiMap.has(upi)) upiMap.set(upi, { count: 0, clicks: 0, offers: new Set() });
      const entry = upiMap.get(upi)!;
      entry.count++;
      entry.clicks += r.clickCount || 0;
      if (r.offerName) entry.offers.add(r.offerName);
    }
    const upiBreakdown = Array.from(upiMap.entries())
      .map(([upi, d]) => ({ upi, count: d.count, clicks: d.clicks, offers: Array.from(d.offers) }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50);

    // Offer breakdown
    const offerMap = new Map<string, { count: number; clicks: number; active: number }>();
    for (const r of records) {
      const name = r.offerName || 'Unknown';
      if (!offerMap.has(name)) offerMap.set(name, { count: 0, clicks: 0, active: 0 });
      const entry = offerMap.get(name)!;
      entry.count++;
      entry.clicks += r.clickCount || 0;
      if (r.linkStatus !== 'Revoked') entry.active++;
    }
    const offerBreakdown = Array.from(offerMap.entries())
      .map(([offerName, d]) => ({ offerName, count: d.count, clicks: d.clicks, active: d.active }))
      .sort((a, b) => b.count - a.count);

    return {
      links: filtered.map(r => ({
        id: r.id,
        referrerName: r.referrerName || '',
        offerName: r.offerName || '',
        offerSlug: r.offerSlug || '',
        referralCode: r.referralCode || '',
        customReferrerData: r.customReferrerData || '{}',
        linkStatus: r.linkStatus || 'Active',
        clickCount: r.clickCount || 0,
        referrerSplit: r.referrerSplit || '50',
        referrerUpi: r.referrerUpi || '',
        createdAt: r.createdAt || '',
      })),
      stats: { total: records.length, active, revoked, totalClicks, uniqueOffers, uniqueUPIs },
      upiBreakdown,
      offerBreakdown,
    };
  },
});
