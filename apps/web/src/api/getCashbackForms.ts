import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';

export default createEndpoint({
  description: 'Get all active cashback forms for public display',
  inputSchema: z.object({}),
  outputSchema: z.object({
    forms: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      fields: z.string(),
      logoUrl: z.string(),
      bannerUrl: z.string(),
      sampleScreenshotUrl: z.string(),
      slug: z.string(),
      isPublic: z.boolean(),
      partnerLink: z.string(),
      isEmbed: z.boolean(),
    })),
  }),
  execute: async () => {
    const { records } = await db.cashbackForms.findAll({ filters: { isActive: true }, limit: 100 });
    return {
      forms: records.map(r => ({
        id: r.id,
        title: r.formTitle || '',
        description: r.description || '',
        fields: r.fieldsConfig || '[]',
        logoUrl: r.logoUrl || '',
        bannerUrl: r.bannerUrl || '',
        sampleScreenshotUrl: r.sampleScreenshotUrl || '',
        slug: r.slug || '',
        isPublic: r.isPublic ?? true,
        partnerLink: r.partnerLink || '',
        isEmbed: r.isEmbed ?? false,
      })),
    };
  },
});
