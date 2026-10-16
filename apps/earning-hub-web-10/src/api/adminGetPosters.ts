import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const schema = z.object({ id: z.string(), title: z.string(), imageUrl: z.string(), isActive: z.boolean(), displayOrder: z.number(), createdAt: z.string() });

export default createEndpoint({
  description: 'Admin: get all posters',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({ posters: z.array(schema) }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    const { records } = await zite.posters.findAll({});
    return {
      posters: records
        .filter(r => r.title !== '__config__')
        .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
        .map(r => ({ id: r.id, title: r.title || '', imageUrl: r.imageUrl || '', isActive: r.isActive ?? false, displayOrder: r.displayOrder || 0, createdAt: r.createdAt || '' })),
    };
  },
});
