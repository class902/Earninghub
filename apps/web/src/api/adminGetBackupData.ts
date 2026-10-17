import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

export default createEndpoint({
  description: 'Admin: get full data for a specific cloud backup',
  inputSchema: z.object({ password: z.string(), backupId: z.string() }),
  outputSchema: z.object({ data: z.string(), label: z.string() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    const record = await db.appBackups.findOne({ id: input.backupId });
    if (!record) throw new ApiError({ code: 'NOT_FOUND', message: 'Backup not found' });
    return { data: record.data || '{}', label: record.label || 'backup' };
  },
});
