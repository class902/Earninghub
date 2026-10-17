import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

export default createEndpoint({
  description: 'Admin: delete a cloud backup record',
  inputSchema: z.object({ password: z.string(), backupId: z.string() }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    await db.appBackups.delete({ id: input.backupId });
    return { success: true };
  },
});
