import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';

export default createEndpoint({
  description: 'Track when user clicks the "I have Completed This Offer" button on the tracking page',
  inputSchema: z.object({
    leadDbId: z.string(),
  }),
  outputSchema: z.object({ success: z.boolean(), completionClicks: z.number() }),
  execute: async ({ input }) => {
    const lead = await zite.leads.findOne({ id: input.leadDbId });
    if (!lead) return { success: false, completionClicks: 0 };

    let actionConfig: Record<string, unknown> = {};
    try {
      if (lead.actionConfig) actionConfig = JSON.parse(lead.actionConfig);
    } catch {}

    const newCount = ((actionConfig.completionClicks as number) || 0) + 1;
    actionConfig.completionClicks = newCount;
    actionConfig.lastCompletionAt = new Date().toISOString();

    await zite.leads.update({
      id: input.leadDbId,
      record: { actionConfig: JSON.stringify(actionConfig) },
    });

    return { success: true, completionClicks: newCount };
  },
});
