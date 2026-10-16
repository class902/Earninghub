import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

/**
 * Soft-delete an offer — sets status to '__TRASH__' instead of DB removal.
 * Permanent deletion is handled by adminPermanentDelete endpoint.
 */
export default createEndpoint({
  description: 'Admin: soft-delete an offer (moves to trash)',
  inputSchema: z.object({ password: z.string(), id: z.string() }),
  outputSchema: z.object({ success: z.boolean(), previousStatus: z.string() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    const record = await zite.offers.findOne({ id: input.id });
    if (!record) throw new ZiteError({ code: 'NOT_FOUND', message: 'Offer not found' });

    const previousStatus = record.status || 'Inactive';
    await zite.offers.update({ id: input.id, record: { status: '__TRASH__' } });
    return { success: true, previousStatus };
  },
});
