import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

export default createEndpoint({
  description: 'Admin: mark a referral bonus as paid or unpaid',
  inputSchema: z.object({
    password: z.string(),
    id: z.string(),
    bonusPaid: z.boolean(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
  execute: async ({ input }) => {
    if (input.password !== getAdminPassword()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid password' });
    }
    await zite.referrals.update({ id: input.id, record: { bonusPaid: input.bonusPaid } });
    return { success: true };
  },
});
