import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

/**
 * Soft-delete a lead — sets _trashed:true in actionConfig instead of DB removal.
 * Permanent deletion is handled by adminPermanentDelete endpoint.
 */
export default createEndpoint({
  description: 'Admin: soft-delete a lead (moves to trash)',
  inputSchema: z.object({ password: z.string(), id: z.string() }),
  outputSchema: z.object({ success: z.boolean(), previousActionConfig: z.string() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    const record = await zite.leads.findOne({ id: input.id });
    if (!record) throw new ZiteError({ code: 'NOT_FOUND', message: 'Lead not found' });

    const prevActionConfig = record.actionConfig || '{}';
    let ac: Record<string, unknown> = {};
    try { ac = JSON.parse(prevActionConfig); } catch {}

    ac._trashed = true;
    ac._trashedAt = new Date().toISOString();

    await zite.leads.update({ id: input.id, record: { actionConfig: JSON.stringify(ac) } });
    return { success: true, previousActionConfig: prevActionConfig };
  },
});
