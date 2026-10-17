import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

const leadSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  summary: z.string(),
  offerName: z.string(),
  offerPayout: z.number(),
  leadData: z.string(),
  status: z.string(),
  publicRemark: z.string(),
  internalNote: z.string(),
  actionConfig: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdByType: z.string(),
  isPrivateLead: z.boolean(),
  isReferralLead: z.boolean(),
  referralCode: z.string(),
  referralLinkId: z.string(),
  resolvedSubmittedAt: z.string(), // submissionDate override (from actionConfig) if set, else createdAt
});

export default createEndpoint({
  description: 'Admin: get all active (non-trashed) leads sorted by latest first',
  inputSchema: z.object({
    password: z.string(),
    includeTrash: z.boolean().optional(), // true = return ONLY trashed items
  }),
  outputSchema: z.object({ leads: z.array(leadSchema) }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    const { records } = await db.leads.findAll({ limit: 2000 });

    // Sort by latest first
    records.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    // Filter: trash vs active
    const filtered = records.filter(r => {
      let isTrashed = false;
      try {
        if (r.actionConfig) {
          const ac = JSON.parse(r.actionConfig);
          isTrashed = ac._trashed === true;
        }
      } catch {}
      return input.includeTrash ? isTrashed : !isTrashed;
    });

    return {
      leads: filtered.map(r => {
        // Parse flags + submissionDate override from actionConfig
        let isPrivateLead = false;
        let isReferralLead = false;
        let submissionDateOverride = '';
        try {
          if (r.actionConfig) {
            const ac = JSON.parse(r.actionConfig);
            isPrivateLead = Boolean(ac.isPrivateLead);
            isReferralLead = Boolean(ac.isReferralLead);
            if (ac.submissionDate && typeof ac.submissionDate === 'string') {
              // Validate it's a real date
              const d = new Date(ac.submissionDate);
              if (!isNaN(d.getTime())) submissionDateOverride = ac.submissionDate;
            }
          }
        } catch {}
        const createdAt = r.createdAt || '';
        return {
          id: r.id,
          leadId: r.leadId || `EH-${r.id.slice(-6).toUpperCase()}`,
          summary: r.summary || '',
          offerName: r.offerName || '',
          offerPayout: r.offerPayout || 0,
          leadData: r.leadData || '{}',
          status: r.status || 'Pending',
          publicRemark: r.publicRemark || '',
          internalNote: r.internalNote || '',
          actionConfig: r.actionConfig || '',
          createdAt,
          updatedAt: (r as Record<string, unknown>).updatedAt as string || createdAt,
          createdByType: (r as Record<string, unknown>).createdByType as string || '',
          isPrivateLead,
          isReferralLead: isReferralLead || Boolean(r.isReferralLead),
          referralCode: r.referralCode || '',
          referralLinkId: r.referralLinkId || '',
          resolvedSubmittedAt: submissionDateOverride || createdAt,
        };
      }),
    };
  },
});
