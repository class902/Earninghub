import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { Email } from 'zitejs/email';

const LOGIN_OTP_LABEL = '__admin_login_otp__';
const CREDS_LABEL = '__admin_credentials__';
const ADMIN_NOTIFICATION_EMAIL = 'gclass902@gmail.com';
const DEFAULT_USERNAME = 'ranahub902';
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getAdminUsername(): Promise<string> {
  try {
    const record = await zite.appBackups.findOne({ filters: { label: CREDS_LABEL } });
    if (record?.data) {
      const creds = JSON.parse(record.data) as { username: string };
      if (creds.username) return creds.username;
    }
  } catch {}
  return DEFAULT_USERNAME;
}

export default createEndpoint({
  description: 'Request OTP for admin login — verifies Admin ID and sends a 6-digit OTP to gclass902@gmail.com',
  inputSchema: z.object({ username: z.string() }),
  outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  execute: async ({ input }) => {
    const validUsername = await getAdminUsername();
    if (input.username.trim().toLowerCase() !== validUsername.toLowerCase()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid Admin ID. Please check and try again.' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + OTP_TTL_MS;
    const otpData = JSON.stringify({ otp, expiresAt, username: validUsername });

    const existing = await zite.appBackups.findOne({ filters: { label: LOGIN_OTP_LABEL } });
    if (existing) {
      await zite.appBackups.update({ id: existing.id, record: { data: otpData } });
    } else {
      await zite.appBackups.create({
        record: { label: LOGIN_OTP_LABEL, data: otpData, source: 'Auto', summary: 'Admin Login OTP (system)' },
      });
    }

    try {
      await Email.send({
        to: ADMIN_NOTIFICATION_EMAIL,
        subject: `🔐 EarningHub Admin Login — OTP: ${otp}`,
        body: [
          {
            type: 'text',
            content: `Hello Admin,\n\nYour EarningHub admin login OTP is:\n\n<strong>${otp}</strong>\n\nThis code expires in <strong>10 minutes</strong>. Do not share it with anyone.\n\nIf you did not request this, your admin panel may be under attack — change your credentials immediately.`,
          },
          { type: 'divider' },
          {
            type: 'text',
            content: `This is an automated security email from EarningHub Admin Panel.`,
          },
        ],
      });
      return { success: true, message: `OTP sent to ${ADMIN_NOTIFICATION_EMAIL}. Please check your Gmail inbox (or spam).` };
    } catch {
      throw new ZiteError({
        code: 'INTERNAL_ERROR',
        message: 'Email service unavailable. Please use Admin ID + Password to login instead.',
      });
    }
  },
});
