import { getAdminPassword as getEnvAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';
import { Email } from 'zitejs/email';

const OTP_LABEL = '__admin_otp__';
const CREDS_LABEL = '__admin_credentials__';
const ADMIN_GOOGLE_EMAIL = 'gclass902@gmail.com';
const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function getAdminPassword(): Promise<string> {
  try {
    const record = await zite.appBackups.findOne({ filters: { label: CREDS_LABEL } });
    if (record?.data) {
      const creds = JSON.parse(record.data) as { password: string };
      if (creds.password) return creds.password;
    }
  } catch {}
  return getEnvAdminPassword();
}

export default createEndpoint({
  description: 'Send OTP to admin email for credential change. purpose=change requires auth; purpose=forgot is public.',
  inputSchema: z.object({
    password: z.string().optional(),
    purpose: z.enum(['change', 'forgot']),
  }),
  outputSchema: z.object({ success: z.boolean(), emailSent: z.boolean(), message: z.string() }),
  execute: async ({ input }) => {
    // For 'change', verify the admin is currently authenticated
    if (input.purpose === 'change') {
      const adminPw = await getAdminPassword();
      if (!input.password || (input.password !== getEnvAdminPassword() && input.password !== adminPw)) {
        throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid admin session. Please log in again.' });
      }
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + OTP_TTL_MS;

    // Store OTP in DB
    const otpData = JSON.stringify({ otp, expiresAt, purpose: input.purpose });
    const existing = await zite.appBackups.findOne({ filters: { label: OTP_LABEL } });
    if (existing) {
      await zite.appBackups.update({ id: existing.id, record: { data: otpData } });
    } else {
      await zite.appBackups.create({
        record: { label: OTP_LABEL, data: otpData, source: 'Auto', summary: 'Admin OTP (system)' },
      });
    }

    // Send OTP via email
    try {
      await Email.send({
        to: ADMIN_GOOGLE_EMAIL,
        subject: `EarningHub Admin — Your OTP: ${otp}`,
        body: [
          {
            type: 'text',
            content: `Your admin credential ${input.purpose === 'forgot' ? 'reset' : 'change'} OTP is:\n\n<strong>${otp}</strong>\n\nThis OTP expires in 15 minutes. Do not share it with anyone.`,
          },
          { type: 'divider' },
          {
            type: 'text',
            content: `If you did not request this, someone may be attempting to access your admin panel. Please secure your account immediately.`,
          },
        ],
      });
      return { success: true, emailSent: true, message: `OTP sent to ${ADMIN_GOOGLE_EMAIL}` };
    } catch {
      // Email failed — for 'change' (already authenticated), allow fallback
      if (input.purpose === 'change') {
        return {
          success: true,
          emailSent: false,
          message: `Email could not be sent. Your OTP is: ${otp} (valid 15 min)`,
        };
      }
      // For 'forgot', email is required — can't proceed without it
      throw new ZiteError({
        code: 'INTERNAL_ERROR',
        message: 'Email service unavailable. Please use Google sign-in to access admin.',
      });
    }
  },
});
