import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: get full data for a specific cloud backup',
  inputSchema: z.object({ password: z.string(), backupId: z.string() }),
  outputSchema: z.object({ data: z.string(), label: z.string() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    const record = await zite.appBackups.findOne({ id: input.backupId });
    if (!record) throw new ZiteError({ code: 'NOT_FOUND', message: 'Backup not found' });
    return { data: record.data || '{}', label: record.label || 'backup' };
  },
});
