import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const OTP_LABEL = '__admin_otp__';
const CREDS_LABEL = '__admin_credentials__';

export default createEndpoint({
  description: 'Verify OTP and update admin credentials stored in DB. Works for both change and forgot flows.',
  inputSchema: z.object({
    otp: z.string(),
    newUsername: z.string().min(4),
    newPassword: z.string().min(8),
    purpose: z.enum(['change', 'forgot']),
    // For 'change' flow, must pass current session token
    currentPassword: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  execute: async ({ input }) => {
    // For 'change', verify current session
    if (input.purpose === 'change') {
      if (!input.currentPassword || input.currentPassword !== getAdminPassword()) {
        throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Invalid admin session.' });
      }
    }

    // Verify OTP
    const otpRecord = await zite.appBackups.findOne({ filters: { label: OTP_LABEL } });
    if (!otpRecord?.data) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'No OTP found. Please request a new one.' });
    }

    let otpData: { otp: string; expiresAt: number; purpose: string };
    try {
      otpData = JSON.parse(otpRecord.data);
    } catch {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'Invalid OTP data. Please request a new one.' });
    }

    if (Date.now() > otpData.expiresAt) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'OTP has expired. Please request a new one.' });
    }
    if (otpData.otp !== input.otp.trim()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Incorrect OTP. Please try again.' });
    }
    if (otpData.purpose !== input.purpose) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'OTP was not issued for this purpose.' });
    }

    // OTP verified — update credentials in DB
    const newCreds = JSON.stringify({ username: input.newUsername.trim(), password: input.newPassword });
    const existingCreds = await zite.appBackups.findOne({ filters: { label: CREDS_LABEL } });
    if (existingCreds) {
      await zite.appBackups.update({ id: existingCreds.id, record: { data: newCreds } });
    } else {
      await zite.appBackups.create({
        record: { label: CREDS_LABEL, data: newCreds, source: 'Auto', summary: 'Admin credentials (system)' },
      });
    }

    // Invalidate used OTP
    await zite.appBackups.update({ id: otpRecord.id, record: { data: JSON.stringify({ otp: '', expiresAt: 0 }) } });

    return {
      success: true,
      message: 'Credentials updated successfully. Please log in with your new username and password.',
    };
  },
});
