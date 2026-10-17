import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

export default createEndpoint({
  description: 'Admin: delete a poster',
  inputSchema: z.object({ password: z.string(), id: z.string() }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    await db.posters.delete({ id: input.id });
    return { success: true };
  },
});
