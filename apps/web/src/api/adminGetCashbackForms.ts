import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

export default createEndpoint({
  description: 'Admin: Get all cashback forms (active and inactive)',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({
    forms: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      isActive: z.boolean(),
      fieldsConfig: z.string(),
      logoUrl: z.string(),
      bannerUrl: z.string(),
      sampleScreenshotUrl: z.string(),
      createdAt: z.string(),
      slug: z.string(),
      isPublic: z.boolean(),
      partnerLink: z.string(),
      isEmbed: z.boolean(),
    })),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    const { records } = await db.cashbackForms.findAll({ limit: 200 });
    records.sort((a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return {
      forms: records.map(r => ({
        id: r.id,
        title: r.formTitle || '',
        description: r.description || '',
        isActive: r.isActive ?? false,
        fieldsConfig: r.fieldsConfig || '[]',
        logoUrl: r.logoUrl || '',
        bannerUrl: r.bannerUrl || '',
        sampleScreenshotUrl: r.sampleScreenshotUrl || '',
        createdAt: r.createdAt || '',
        slug: r.slug || '',
        isPublic: r.isPublic ?? true,
        partnerLink: r.partnerLink || '',
        isEmbed: r.isEmbed ?? false,
      })),
    };
  },
});
