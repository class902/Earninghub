import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const CREDS_LABEL = '__admin_credentials__';

// Default admin ID. The password is never hardcoded: it comes from the
// ZITE_ADMIN_PASSWORD env var (the server fails closed if it is not set).
const DEFAULT_USERNAME = 'ranahub902';

async function getAdminCredentials(): Promise<{ username: string; password: string }> {
  try {
    const record = await zite.appBackups.findOne({ filters: { label: CREDS_LABEL } });
    if (record?.data) {
      const creds = JSON.parse(record.data) as { username: string; password: string };
      if (creds.username && creds.password) return creds;
    }
  } catch {}
  // Default: default admin ID + password from the ZITE_ADMIN_PASSWORD env var
  return { username: DEFAULT_USERNAME, password: getAdminPassword() };
}

export default createEndpoint({
  description: 'Validate admin credentials — all password checks happen server-side. Returns a session token used by all admin API calls.',
  inputSchema: z.object({ username: z.string(), password: z.string() }),
  outputSchema: z.object({ success: z.boolean(), sessionToken: z.string() }),
  execute: async ({ input }) => {
    const creds = await getAdminCredentials();
    if (input.username.trim() !== creds.username || input.password !== creds.password) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid Admin ID or password.' });
    }
    // The session token is always (env var || default password).
    // All admin endpoints validate incoming password against this same value.
    const sessionToken = getAdminPassword();
    return { success: true, sessionToken };
  },
});
