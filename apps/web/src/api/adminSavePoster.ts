import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

export default createEndpoint({
  description: 'Admin: create or update a poster',
  inputSchema: z.object({
    password: z.string(), id: z.string().optional(),
    title: z.string(), imageUrl: z.string(), isActive: z.boolean(), displayOrder: z.number(),
  }),
  outputSchema: z.object({ success: z.boolean(), id: z.string() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    const record = { title: input.title, imageUrl: input.imageUrl, isActive: input.isActive, displayOrder: input.displayOrder };
    if (input.id) {
      await db.posters.update({ id: input.id, record });
      return { success: true, id: input.id };
    }
    const created = await db.posters.create({ record });
    return { success: true, id: created.id };
  },
});
