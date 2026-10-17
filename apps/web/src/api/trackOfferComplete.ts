import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint } from '@server/backend';

export default createEndpoint({
  description: 'Track when user clicks the "I have Completed This Offer" button on the tracking page',
  inputSchema: z.object({
    leadDbId: z.string(),
  }),
  outputSchema: z.object({ success: z.boolean(), completionClicks: z.number() }),
  execute: async ({ input }) => {
    const lead = await db.leads.findOne({ id: input.leadDbId });
    if (!lead) return { success: false, completionClicks: 0 };

    let actionConfig: Record<string, unknown> = {};
    try {
      if (lead.actionConfig) actionConfig = JSON.parse(lead.actionConfig);
    } catch {}

    const newCount = ((actionConfig.completionClicks as number) || 0) + 1;
    actionConfig.completionClicks = newCount;
    actionConfig.lastCompletionAt = new Date().toISOString();

    await db.leads.update({
      id: input.leadDbId,
      record: { actionConfig: JSON.stringify(actionConfig) },
    });

    return { success: true, completionClicks: newCount };
  },
});
