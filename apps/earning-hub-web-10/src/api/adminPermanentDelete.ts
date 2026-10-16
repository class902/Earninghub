import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

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
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    if (input.type === 'lead') {
      await zite.leads.delete({ id: input.id });
    } else {
      await zite.offers.delete({ id: input.id });
    }

    return { success: true };
  },
});
