import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

export default createEndpoint({
  description: 'Admin: list all cloud backups (no data field)',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({
    backups: z.array(z.object({
      id: z.string(),
      label: z.string(),
      source: z.string(),
      summary: z.string(),
      createdAt: z.string(),
    })),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    const { records } = await db.appBackups.findAll({
      limit: 50,
      fields: ['id', 'label', 'source', 'summary', 'createdAt'],
    });
    const sorted = [...records].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
    return {
      backups: sorted.map(r => ({
        id: r.id,
        label: r.label || 'Untitled',
        source: r.source || 'Manual',
        summary: r.summary || '',
        createdAt: r.createdAt || '',
      })),
    };
  },
});
