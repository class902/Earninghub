import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')
    .replace(/--+/g, '-').replace(/^-|-$/g, '');
}

export default createEndpoint({
  description: 'Admin: Create or update a cashback form',
  inputSchema: z.object({
    password: z.string(),
    id: z.string().optional(),
    title: z.string(),
    description: z.string(),
    isActive: z.boolean(),
    fieldsConfig: z.string(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
    sampleScreenshotUrl: z.string().optional(),
    // New fields
    isPublic: z.boolean().optional(),
    partnerLink: z.string().optional(),
    isEmbed: z.boolean().optional(),
  }),
  outputSchema: z.object({ success: z.boolean(), id: z.string(), slug: z.string() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    if (!input.title.trim()) {
      throw new ApiError({ code: 'BAD_REQUEST', message: 'Form title is required' });
    }

    // Generate slug from title
    const slug = slugify(input.title);

    const record = {
      formTitle: input.title,
      description: input.description,
      isActive: input.isActive,
      fieldsConfig: input.fieldsConfig,
      logoUrl: input.logoUrl || '',
      bannerUrl: input.bannerUrl || '',
      sampleScreenshotUrl: input.sampleScreenshotUrl || '',
      slug,
      isPublic: input.isPublic ?? true,
      partnerLink: input.partnerLink || '',
      isEmbed: input.isEmbed ?? false,
    };

    if (input.id) {
      await db.cashbackForms.update({ id: input.id, record });
      return { success: true, id: input.id, slug };
    } else {
      const created = await db.cashbackForms.create({ record });
      return { success: true, id: created.id, slug };
    }
  },
});
