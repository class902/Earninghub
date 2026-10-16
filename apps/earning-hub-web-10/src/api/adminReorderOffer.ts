import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: swap the order of two adjacent offers',
  inputSchema: z.object({
    password: z.string(),
    offerId: z.string(),
    direction: z.enum(['up', 'down']),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }

    // Get all non-trashed offers
    const { records } = await zite.offers.findAll({});
    const allOffers = records.filter(r => r.status !== '__TRASH__');

    // Sort by sortRank descending (rank 0 goes to bottom) — same ordering as displayed
    allOffers.sort((a, b) => {
      const ra = a.sortRank || 0;
      const rb = b.sortRank || 0;
      if (ra === 0 && rb === 0) return 0;
      if (ra === 0) return 1;
      if (rb === 0) return -1;
      return rb - ra;
    });

    const idx = allOffers.findIndex(o => o.id === input.offerId);
    if (idx === -1) throw new ZiteError({ code: 'NOT_FOUND', message: 'Offer not found' });

    const swapIdx = input.direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allOffers.length) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'Cannot move further' });
    }

    // Re-assign sequential ranks to all offers (highest position = highest rank number)
    // Then swap the two target positions
    const total = allOffers.length;
    // Assign sequential ranks: position 0 gets rank=total, position 1 gets rank=total-1, etc.
    const ranks = allOffers.map((_, i) => total - i);

    // Swap the ranks of the two items
    const tmpRank = ranks[idx];
    ranks[idx] = ranks[swapIdx];
    ranks[swapIdx] = tmpRank;

    // Persist all rank changes
    const updates = allOffers.map((o, i) => 
      zite.offers.update({ id: o.id, record: { sortRank: ranks[i] } })
    );
    await Promise.all(updates);

    return { success: true };
  },
});
