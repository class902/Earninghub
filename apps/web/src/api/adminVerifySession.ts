import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { createEndpoint } from '@server/backend';

export default createEndpoint({
  description: 'Verify if an admin session token is still valid — used on page load to catch stale sessions',
  inputSchema: z.object({ password: z.string() }),
  outputSchema: z.object({ valid: z.boolean(), reason: z.string().optional() }),
  execute: async ({ input }) => {
    // Throws (fails closed) if ADMIN_PASSWORD is not configured
    const envPassword = getAdminPassword();
    const valid = input.password === envPassword;
    return {
      valid,
      reason: valid ? undefined : 'Session token does not match current admin password. Please log in again.',
    };
  },
});
