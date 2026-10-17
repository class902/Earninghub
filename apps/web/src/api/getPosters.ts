import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';

export default createEndpoint({
  description: 'Get active posters for homepage banner',
  inputSchema: z.object({}),
  outputSchema: z.object({
    posters: z.array(z.object({
      id: z.string(),
      title: z.string(),
      imageUrl: z.string(),
      displayOrder: z.number(),
      isActive: z.boolean(),
    })),
  }),
  execute: async () => {
    const { records } = await db.posters.findAll({});
    const posters = records
      .filter(r => r.isActive && r.imageUrl && r.imageUrl.trim())
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map(r => ({
        id: r.id,
        title: r.title || '',
        imageUrl: r.imageUrl || '',
        displayOrder: r.displayOrder || 0,
        isActive: true,
      }));
    return { posters };
  },
});
