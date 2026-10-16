import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: create or update a poster',
  inputSchema: z.object({
    password: z.string(), id: z.string().optional(),
    title: z.string(), imageUrl: z.string(), isActive: z.boolean(), displayOrder: z.number(),
  }),
  outputSchema: z.object({ success: z.boolean(), id: z.string() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    const record = { title: input.title, imageUrl: input.imageUrl, isActive: input.isActive, displayOrder: input.displayOrder };
    if (input.id) {
      await zite.posters.update({ id: input.id, record });
      return { success: true, id: input.id };
    }
    const created = await zite.posters.create({ record });
    return { success: true, id: created.id };
  },
});
