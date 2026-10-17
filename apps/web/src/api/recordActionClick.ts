import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';

export default createEndpoint({
  description: 'Record a click on the custom action button in the user tracking panel',
  inputSchema: z.object({
    leadDbId: z.string(), // The DB record ID (UUID), not the EH-XXXXXX lead ID
  }),
  outputSchema: z.object({ success: z.boolean(), clickCount: z.number() }),
  execute: async ({ input }) => {
    const lead = await db.leads.findOne({ id: input.leadDbId });
    if (!lead) return { success: false, clickCount: 0 };

    let actionConfig: Record<string, unknown> = {};
    try {
      if (lead.actionConfig) actionConfig = JSON.parse(lead.actionConfig);
    } catch {}

    const newCount = ((actionConfig.clickCount as number) || 0) + 1;
    actionConfig.clickCount = newCount;
    actionConfig.lastClickAt = new Date().toISOString();

    await db.leads.update({
      id: input.leadDbId,
      record: { actionConfig: JSON.stringify(actionConfig) },
    });

    return { success: true, clickCount: newCount };
  },
});
