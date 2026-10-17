import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-').replace(/^-|-$/g, '');
}

export default createEndpoint({
  description: 'Get a public cashback form by its slug',
  inputSchema: z.object({ slug: z.string() }),
  outputSchema: z.object({
    found: z.boolean(),
    form: z.object({
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
    }).nullable(),
  }),
  execute: async ({ input }) => {
    const { records } = await db.cashbackForms.findAll({ filters: { isActive: true }, limit: 200 });

    // Find by exact slug field first, then fall back to slugified title
    const match = records.find(r => {
      const dbSlug = r.slug || slugify(r.formTitle || '');
      return dbSlug === input.slug;
    });

    if (!match) {
      return { found: false, form: null };
    }

    return {
      found: true,
      form: {
        id: match.id,
        title: match.formTitle || '',
        description: match.description || '',
        fields: match.fieldsConfig || '[]',
        logoUrl: match.logoUrl || '',
        bannerUrl: match.bannerUrl || '',
        sampleScreenshotUrl: match.sampleScreenshotUrl || '',
        slug: match.slug || slugify(match.formTitle || ''),
        isPublic: match.isPublic ?? true,
        partnerLink: match.partnerLink || '',
        isEmbed: match.isEmbed ?? false,
      },
    };
  },
});
