import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint } from 'zitejs/backend';

const ANALYTICS_KEY = '__analytics__';

export default createEndpoint({
  description: 'Track analytics events: offer_view, offer_click, offer_apply for CPM/CTR calculations',
  inputSchema: z.object({
    event: z.enum(['offer_view', 'offer_click', 'offer_apply']),
    offerName: z.string(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    const existing = await zite.posters.findOne({ filters: { title: ANALYTICS_KEY } });

    let data: Record<string, { views: number; clicks: number; applies: number }> = {};
    try {
      if (existing?.imageUrl) data = JSON.parse(existing.imageUrl);
    } catch {}

    const offerKey = input.offerName.toLowerCase().slice(0, 60);
    if (!data[offerKey]) data[offerKey] = { views: 0, clicks: 0, applies: 0 };

    if (input.event === 'offer_view') data[offerKey].views = (data[offerKey].views || 0) + 1;
    else if (input.event === 'offer_click') data[offerKey].clicks = (data[offerKey].clicks || 0) + 1;
    else if (input.event === 'offer_apply') data[offerKey].applies = (data[offerKey].applies || 0) + 1;

    const payload = JSON.stringify(data);

    if (existing) {
      await zite.posters.update({ id: existing.id, record: { imageUrl: payload } });
    } else {
      await zite.posters.create({ record: { title: ANALYTICS_KEY, imageUrl: payload, isActive: false, displayOrder: 9998 } });
    }

    return { success: true };
  },
});
