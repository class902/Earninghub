import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

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
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    const record = await db.offers.findOne({ id: input.id });
    if (!record) throw new ApiError({ code: 'NOT_FOUND', message: 'Offer not found' });

    const previousStatus = record.status || 'Inactive';
    await db.offers.update({ id: input.id, record: { status: '__TRASH__' } });
    return { success: true, previousStatus };
  },
});
