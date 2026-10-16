import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: Get affiliate marketing KPIs — CPL, CTR, CPM, conversion funnel, per-offer stats',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({
    global: z.object({
      totalLeads: z.number(),
      totalConversions: z.number(),
      totalPendingLeads: z.number(),
      totalRevenue: z.number(),
      conversionRate: z.number(),
      cpl: z.number(),
      avgPayout: z.number(),
      totalActionClicks: z.number(),
      totalCompletionClicks: z.number(),
      completionToLeadRate: z.number(),
      todayLeads: z.number(),
      thisWeekLeads: z.number(),
      thisMonthLeads: z.number(),
    }),
    byOffer: z.array(z.object({
      offerName: z.string(),
      leads: z.number(),
      conversions: z.number(),
      pending: z.number(),
      revenue: z.number(),
      cpl: z.number(),
      convRate: z.number(),
      completionClicks: z.number(),
      views: z.number(),
      clicks: z.number(),
      ctr: z.number(),
    })),
    timeBreakdown: z.array(z.object({
      label: z.string(),
      leads: z.number(),
      conversions: z.number(),
    })),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    const [{ records: leads }, analyticsRecord] = await Promise.all([
      zite.leads.findAll({ limit: 2000 }),
      zite.posters.findOne({ filters: { title: '__analytics__' } }),
    ]);

    // Parse analytics events data
    let analyticsData: Record<string, { views: number; clicks: number; applies: number }> = {};
    try {
      if (analyticsRecord?.imageUrl) analyticsData = JSON.parse(analyticsRecord.imageUrl);
    } catch {}

    // ── CRITICAL: Exclude trashed leads before any metrics calculation ──
    const filteredLeads = leads.filter(l => {
      if (!l.actionConfig) return true;
      try { const ac = JSON.parse(l.actionConfig); return ac._trashed !== true; } catch { return true; }
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Global metrics
    const totalLeads = filteredLeads.length;
    const conversions = filteredLeads.filter(l => ['Approved', 'Paid', 'Cashback Sent'].includes(l.status || ''));
    const totalConversions = conversions.length;
    const totalPendingLeads = filteredLeads.filter(l => l.status === 'Pending').length;
    const totalRevenue = conversions.reduce((s, l) => s + (l.offerPayout || 0), 0);
    const allRevenue = filteredLeads.reduce((s, l) => s + (l.offerPayout || 0), 0);

    let totalActionClicks = 0;
    let totalCompletionClicks = 0;
    filteredLeads.forEach(l => {
      try {
        if (l.actionConfig) {
          const ac = JSON.parse(l.actionConfig);
          totalActionClicks += (ac.clickCount || 0);
          totalCompletionClicks += (ac.completionClicks || 0);
        }
      } catch {}
    });

    const todayLeads = filteredLeads.filter(l => l.createdAt && new Date(l.createdAt) >= todayStart).length;
    const thisWeekLeads = filteredLeads.filter(l => l.createdAt && new Date(l.createdAt) >= weekStart).length;
    const thisMonthLeads = filteredLeads.filter(l => l.createdAt && new Date(l.createdAt) >= monthStart).length;

    // Per-offer breakdown
    const offerMap = new Map<string, { leads: number; conversions: number; pending: number; revenue: number; completionClicks: number }>();
    filteredLeads.forEach(l => {
      const key = (l.offerName || 'Unknown').toLowerCase();
      const cur = offerMap.get(key) || { leads: 0, conversions: 0, pending: 0, revenue: 0, completionClicks: 0 };
      cur.leads++;
      if (['Approved', 'Paid', 'Cashback Sent'].includes(l.status || '')) {
        cur.conversions++;
        cur.revenue += l.offerPayout || 0;
      }
      if (l.status === 'Pending') cur.pending++;
      try {
        if (l.actionConfig) {
          const ac = JSON.parse(l.actionConfig);
          cur.completionClicks += (ac.completionClicks || 0);
        }
      } catch {}
      offerMap.set(key, cur);
    });

    const byOffer = Array.from(offerMap.entries())
      .map(([key, d]) => {
        const events = analyticsData[key] || { views: 0, clicks: 0, applies: 0 };
        return {
          offerName: key,
          leads: d.leads,
          conversions: d.conversions,
          pending: d.pending,
          revenue: d.revenue,
          cpl: d.leads > 0 ? Math.round(d.revenue / d.leads) : 0,
          convRate: d.leads > 0 ? Math.round((d.conversions / d.leads) * 100) : 0,
          completionClicks: d.completionClicks,
          views: events.views || 0,
          clicks: events.clicks || 0,
          ctr: (events.views || 0) > 0 ? Math.round(((events.clicks || 0) / (events.views || 0)) * 100) : 0,
        };
      })
      .sort((a, b) => b.leads - a.leads);

    // 14-day time breakdown
    const timeBreakdown = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayLeads = filteredLeads.filter(l => {
        if (!l.createdAt) return false;
        const ld = new Date(l.createdAt);
        return ld >= dayStart && ld < dayEnd;
      });
      return {
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        leads: dayLeads.length,
        conversions: dayLeads.filter(l => ['Approved', 'Paid', 'Cashback Sent'].includes(l.status || '')).length,
      };
    });

    return {
      global: {
        totalLeads,
        totalConversions,
        totalPendingLeads,
        totalRevenue,
        conversionRate: totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 100) : 0,
        cpl: totalLeads > 0 ? Math.round(allRevenue / totalLeads) : 0,
        avgPayout: totalLeads > 0 ? Math.round(allRevenue / totalLeads) : 0,
        totalActionClicks,
        totalCompletionClicks,
        completionToLeadRate: totalLeads > 0 ? Math.round((totalCompletionClicks / totalLeads) * 100) : 0,
        todayLeads,
        thisWeekLeads,
        thisMonthLeads,
      },
      byOffer,
      timeBreakdown,
    };
  },
});
