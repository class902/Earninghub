import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const trashedLeadSchema = z.object({
  id: z.string(), type: z.literal('lead'),
  leadId: z.string(), name: z.string(), offerName: z.string(),
  offerPayout: z.number(), status: z.string(), trashedAt: z.string(),
  actionConfig: z.string(),
});

const trashedOfferSchema = z.object({
  id: z.string(), type: z.literal('offer'),
  name: z.string(), payout: z.number(), category: z.string(),
  status: z.string(), trashedAt: z.string(),
});

export default createEndpoint({
  description: 'Admin: get all trashed items (leads + offers)',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({
    trashedLeads: z.array(trashedLeadSchema),
    trashedOffers: z.array(trashedOfferSchema),
    total: z.number(),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    const [{ records: allLeads }, { records: allOffers }] = await Promise.all([
      zite.leads.findAll({ limit: 2000 }),
      zite.offers.findAll({}),
    ]);

    // Trashed leads: _trashed: true in actionConfig
    const trashedLeads = allLeads
      .filter(r => {
        try { const ac = JSON.parse(r.actionConfig || '{}'); return ac._trashed === true; } catch { return false; }
      })
      .map(r => {
        let trashedAt = '';
        let name = '';
        try {
          const ac = JSON.parse(r.actionConfig || '{}');
          trashedAt = ac._trashedAt || '';
          const data = JSON.parse(r.leadData || '{}');
          const nameEntry = Object.entries(data).find(([k]) => k.toLowerCase().includes('name'));
          name = nameEntry ? String(nameEntry[1]) : r.summary || '';
        } catch {}
        return {
          id: r.id, type: 'lead' as const,
          leadId: r.leadId || `EH-${r.id.slice(-6).toUpperCase()}`,
          name, offerName: r.offerName || '',
          offerPayout: r.offerPayout || 0, status: r.status || 'Pending',
          trashedAt, actionConfig: r.actionConfig || '{}',
        };
      })
      .sort((a, b) => new Date(b.trashedAt).getTime() - new Date(a.trashedAt).getTime());

    // Trashed offers: status === '__TRASH__'
    const trashedOffers = allOffers
      .filter(r => r.status === '__TRASH__')
      .map(r => ({
        id: r.id, type: 'offer' as const,
        name: r.name || '', payout: r.payout || 0,
        category: r.category || '', status: '__TRASH__',
        trashedAt: r.expiresAt || '', // using available date field
      }));

    return {
      trashedLeads,
      trashedOffers,
      total: trashedLeads.length + trashedOffers.length,
    };
  },
});
