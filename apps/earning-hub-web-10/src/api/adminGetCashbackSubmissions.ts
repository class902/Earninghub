import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: Get cashback form submissions',
  inputSchema: z.object({
    password: z.string(),
    formTitle: z.string().optional(),
  }),
  outputSchema: z.object({
    submissions: z.array(
      z.object({
        id: z.string(),
        referenceId: z.string(),
        formTitle: z.string(),
        submissionData: z.string(),
        submittedAt: z.string(),
      })
    ),
  }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    const { records } = await zite.cashbackSubmissions.findAll({ limit: 1000 });

    let filtered = records;
    if (input.formTitle) {
      const q = input.formTitle.toLowerCase();
      filtered = records.filter(r => r.formTitle?.toLowerCase().includes(q));
    }

    filtered.sort(
      (a, b) =>
        new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );

    return {
      submissions: filtered.map(r => ({
        id: r.id,
        referenceId: r.referenceId || '',
        formTitle: r.formTitle || '',
        submissionData: r.submissionData || '{}',
        submittedAt: r.submittedAt || '',
      })),
    };
  },
});
