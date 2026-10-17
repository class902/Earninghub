import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

export default createEndpoint({
  description: 'Admin: permanently delete a trashed item (irreversible)',
  inputSchema: z.object({
    password: z.string(),
    id: z.string(),
    type: z.enum(['lead', 'offer']),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    if (input.type === 'lead') {
      await db.leads.delete({ id: input.id });
    } else {
      await db.offers.delete({ id: input.id });
    }

    return { success: true };
  },
});
