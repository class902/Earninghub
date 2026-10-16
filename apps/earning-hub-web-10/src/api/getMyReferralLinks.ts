import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';

export default createEndpoint({
  description: 'Get all referral links belonging to a UPI — shows existing links & quick stats for the Refer Hub',
  inputSchema: z.object({
    referrerUpi: z.string(),
  }),
  outputSchema: z.object({
    links: z.array(z.object({
      id: z.string(),
      offerName: z.string(),
      offerSlug: z.string(),
      referralCode: z.string(),
      linkStatus: z.string(),
      clickCount: z.number(),
      leadCount: z.number(),
      referrerCut: z.number(),
      userCut: z.number(),
      createdAt: z.string(),
      totalEarnings: z.number(),
    })),
  }),
  execute: async ({ input }) => {
    const upi = input.referrerUpi.trim().toLowerCase();
    if (!upi || upi.length < 3) return { links: [] };

    const { records } = await zite.referralLinks.findAll({ limit: 200 });
    const userLinks = records.filter(r => (r.referrerUpi || '').toLowerCase() === upi);

    if (userLinks.length === 0) return { links: [] };

    // Batch fetch leads for earnings calculation
    const codes = userLinks.map(l => l.referralCode).filter(Boolean);
    const { records: allLeads } = await zite.leads.findAll({ limit: 2000 });
    const PAID_SET = new Set(['Approved', 'Cashback Sent', 'Paid']);

    const linkResults = userLinks.map(link => {
      const linkLeads = allLeads.filter(l => {
        if (l.referralCode !== link.referralCode) return false;
        // Exclude trashed
        if (l.actionConfig) {
          try { const ac = JSON.parse(l.actionConfig); if (ac._trashed === true) return false; } catch {}
        }
        return true;
      });

      const referrerCut = link.referrerCut || Math.round((Number(link.referrerSplit || '50') / 100) * 100);
      const totalEarnings = linkLeads.filter(l => PAID_SET.has(l.status || '')).length * referrerCut;

      return {
        id: link.id,
        offerName: link.offerName || '',
        offerSlug: link.offerSlug || '',
        referralCode: link.referralCode || '',
        linkStatus: link.linkStatus || 'Active',
        clickCount: link.clickCount || 0,
        leadCount: linkLeads.length,
        referrerCut: link.referrerCut || 0,
        userCut: link.userCut || 0,
        createdAt: link.createdAt || '',
        totalEarnings,
      };
    });

    return { links: linkResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
  },
});
