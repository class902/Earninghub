import { getAdminPassword } from '../lib/adminAuth';
import { createSessionToken } from '@server/auth';
import { z } from 'zod';
import { db } from '@server/db';
import { createEndpoint, ApiError } from '@server/backend';

const CREDS_LABEL = '__admin_credentials__';

// Default admin ID. The password is never hardcoded: it comes from the
// ADMIN_PASSWORD env var (the server fails closed if it is not set).
const DEFAULT_USERNAME = 'ranahub902';

async function getAdminCredentials(): Promise<{ username: string; password: string }> {
  try {
    const record = await db.appBackups.findOne({ filters: { label: CREDS_LABEL } });
    if (record?.data) {
      const creds = JSON.parse(record.data) as { username: string; password: string };
      if (creds.username && creds.password) return creds;
    }
  } catch {}
  // Default: default admin ID + password from the ADMIN_PASSWORD env var
  return { username: DEFAULT_USERNAME, password: getAdminPassword() };
}

export default createEndpoint({
  description: 'Validate admin credentials — all password checks happen server-side. Returns a session token used by all admin API calls.',
  inputSchema: z.object({ username: z.string(), password: z.string() }),
  outputSchema: z.object({ success: z.boolean(), sessionToken: z.string() }),
  execute: async ({ input }) => {
    const creds = await getAdminCredentials();
    if (input.username.trim() !== creds.username || input.password !== creds.password) {
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid Admin ID or password.' });
    }
    // Signed, expiring session token. The API router verifies it on every admin call.
    const sessionToken = await createSessionToken();
    return { success: true, sessionToken };
  },
});
