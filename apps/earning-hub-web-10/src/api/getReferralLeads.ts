import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';

// ── CHANGES: Proper masking functions per spec ──
function maskName(name: string): string {
  if (!name || name.length < 3) return '***';
  return name[0] + '***' + name.slice(-1);
}
function maskUpi(upi: string): string {
  const at = upi.indexOf('@');
  if (at <= 1) return '***';
  return upi.slice(0, 2) + '***' + upi.slice(at);
}
function maskMobile(mobile: string): string {
  if (!mobile || mobile.length < 6) return '******';
  return mobile.slice(0, 2) + '****' + mobile.slice(-2);
}

export default createEndpoint({
  description: 'Get masked leads generated from a specific referral link — for the referral tracker dashboard',
  inputSchema: z.object({ code: z.string() }),
  outputSchema: z.object({
    valid: z.boolean(),
    reason: z.string().optional(),
    link: z.object({
      id: z.string(),
      referrerName: z.string(),
      offerName: z.string(),
      offerSlug: z.string(),
      referralCode: z.string(),
      linkStatus: z.string(),
      clickCount: z.number(),
      referrerSplit: z.string(),
      referrerUpi: z.string(),
      createdAt: z.string(),
      leadCount: z.number(),
      referrerCut: z.number(),
      userCut: z.number(),
    }).optional(),
    offer: z.object({
      name: z.string(),
      emoji: z.string(),
      payout: z.number(),
      logoUrl: z.string(),
      status: z.string(),
      expiresAt: z.string().optional(),
      referralEnabled: z.boolean(),
    }).optional(),
    leads: z.array(z.object({
      maskedName: z.string(),
      maskedUpi: z.string(),
      maskedMobile: z.string(),
      status: z.string(),
      referrerEarning: z.number(),
      createdAt: z.string(),
    })),
    totalEarnings: z.number(),
    pendingEarnings: z.number(),
  }),
  execute: async ({ input }) => {
    const linkRecord = await zite.referralLinks.findOne({ filters: { referralCode: input.code } });
    if (!linkRecord) return { valid: false, reason: 'Link not found', leads: [], totalEarnings: 0, pendingEarnings: 0 };

    const { records: allOffers } = await zite.offers.findAll({});
    const offer = allOffers.find(r => {
      const slug = (r.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return slug === linkRecord.offerSlug || r.name === linkRecord.offerName;
    });

    const { records: rawLeads } = await zite.leads.findAll({ filters: { referralCode: input.code }, limit: 500 });
    
    // ── CRITICAL: Exclude trashed leads ──
    const allLeads = rawLeads.filter(l => {
      if (!l.actionConfig) return true;
      try { const ac = JSON.parse(l.actionConfig); return ac._trashed !== true; } catch { return true; }
    });
    
    // ── CHANGES: Use absolute referrerCut from the link record ──
    const referrerCutPerLead = linkRecord.referrerCut || (() => {
      // Fallback to percentage-based calculation for legacy links
      const referrerSplit = Number(linkRecord.referrerSplit || '50');
      const offerPayout = offer?.payout || 0;
      return Math.round((referrerSplit / 100) * offerPayout);
    })();

    const PAID_SET = new Set(['Approved', 'Cashback Sent', 'Paid']);
    const PENDING_SET = new Set(['Pending', 'In Review', 'Under Review']);

    let totalEarnings = 0;
    let pendingEarnings = 0;

    const maskedLeads = allLeads
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map(lead => {
        let name = '—';
        let upi = '—';
        let mobile = '—';
        try {
          const data = JSON.parse(lead.leadData || '{}');
          const nameEntry = Object.entries(data).find(([k]) => k.toLowerCase().includes('name'));
          const upiEntry = Object.entries(data).find(([k]) => k.toLowerCase().includes('upi'));
          const mobileEntry = Object.entries(data).find(([k]) => k.toLowerCase().includes('mobile') || k.toLowerCase().includes('phone'));
          if (nameEntry) name = String(nameEntry[1]);
          if (upiEntry) upi = String(upiEntry[1]);
          if (mobileEntry) mobile = String(mobileEntry[1]);
        } catch {}

        const status = lead.status || 'Pending';
        if (PAID_SET.has(status)) totalEarnings += referrerCutPerLead;
        if (PENDING_SET.has(status)) pendingEarnings += referrerCutPerLead;

        return {
          maskedName: maskName(name),
          maskedUpi: maskUpi(upi),
          maskedMobile: maskMobile(mobile),
          status,
          referrerEarning: referrerCutPerLead,
          createdAt: lead.createdAt || '',
        };
      });

    // Update lead count (fire-and-forget)
    zite.referralLinks.update({ id: linkRecord.id, record: { leadCount: maskedLeads.length } }).catch(() => {});

    return {
      valid: true,
      link: {
        id: linkRecord.id,
        referrerName: linkRecord.referrerName || '',
        offerName: linkRecord.offerName || '',
        offerSlug: linkRecord.offerSlug || '',
        referralCode: linkRecord.referralCode || '',
        linkStatus: linkRecord.linkStatus || 'Active',
        clickCount: linkRecord.clickCount || 0,
        referrerSplit: linkRecord.referrerSplit || '50',
        referrerUpi: linkRecord.referrerUpi || '',
        createdAt: linkRecord.createdAt || '',
        leadCount: maskedLeads.length,
        referrerCut: linkRecord.referrerCut || 0,
        userCut: linkRecord.userCut || 0,
      },
      offer: offer ? {
        name: offer.name || '',
        emoji: offer.emoji || '🎯',
        payout: offer.payout || 0,
        logoUrl: offer.logoUrl || '',
        status: offer.status || 'Inactive',
        expiresAt: offer.expiresAt || undefined,
        referralEnabled: offer.referralEnabled ?? false,
      } : undefined,
      leads: maskedLeads,
      totalEarnings,
      pendingEarnings,
    };
  },
});
