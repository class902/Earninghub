import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

// Only this Google account is allowed admin access
const ADMIN_GOOGLE_EMAIL = 'gclass902@gmail.com';
const CREDS_LABEL = '__admin_credentials__';

export default createEndpoint({
  authenticated: true,
  description: 'Google OAuth admin login — verifies the signed-in user is the authorised admin email',
  inputSchema: z.object({}),
  outputSchema: z.object({ success: z.boolean(), sessionToken: z.string() }),
  execute: async ({ context }) => {
    if (context.user.email.toLowerCase() !== ADMIN_GOOGLE_EMAIL.toLowerCase()) {
      throw new ZiteError({
        code: 'FORBIDDEN',
        message: 'Access denied. This Google account is not authorised for admin access.',
      });
    }
    // Resolve session token: stored credentials override the ZITE_ADMIN_PASSWORD env var
    let password = getAdminPassword();
    try {
      const record = await zite.appBackups.findOne({ filters: { label: CREDS_LABEL } });
      if (record?.data) {
        const creds = JSON.parse(record.data) as { password?: string };
        if (creds.password) password = creds.password;
      }
    } catch {}
    return { success: true, sessionToken: password };
  },
});
