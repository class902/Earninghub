import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';

function generateRefId(): string {
  return `CB-${Math.floor(100000 + Math.random() * 900000)}`;
}

export default createEndpoint({
  description: 'Submit a standalone cashback form (not linked to any offer)',
  inputSchema: z.object({
    formId: z.string(),
    formTitle: z.string(),
    submissionData: z.string(), // JSON string of { fieldLabel: value }
  }),
  outputSchema: z.object({
    success: z.boolean(),
    referenceId: z.string(),
  }),
  execute: async ({ input }) => {
    const referenceId = generateRefId();

    await zite.cashbackSubmissions.create({
      record: {
        referenceId,
        formTitle: input.formTitle,
        submissionData: input.submissionData,
      },
    });

    return { success: true, referenceId };
  },
});
