import { getAdminPassword } from '../lib/adminAuth';
import { z } from 'zod';
import { zite } from 'zitejs/db';
import { createEndpoint, ZiteError } from 'zitejs/backend';

const LOGIN_OTP_LABEL = '__admin_login_otp__';

export default createEndpoint({
  description: 'Verify admin login OTP and return a session token on success',
  inputSchema: z.object({ username: z.string(), otp: z.string() }),
  outputSchema: z.object({ success: z.boolean(), sessionToken: z.string() }),
  execute: async ({ input }) => {
    const otpRecord = await zite.appBackups.findOne({ filters: { label: LOGIN_OTP_LABEL } });
    if (!otpRecord?.data) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'No OTP found. Please request a new one.' });
    }

    let otpData: { otp: string; expiresAt: number; username: string };
    try {
      otpData = JSON.parse(otpRecord.data);
    } catch {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'Invalid OTP data. Please request a new one.' });
    }

    if (!otpData.otp || Date.now() > otpData.expiresAt) {
      throw new ZiteError({ code: 'BAD_REQUEST', message: 'OTP has expired. Please request a new OTP.' });
    }
    if (otpData.username.toLowerCase() !== input.username.trim().toLowerCase()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'OTP was not issued for this Admin ID.' });
    }
    if (otpData.otp !== input.otp.trim()) {
      throw new ZiteError({ code: 'UNAUTHORIZED', message: 'Incorrect OTP. Please check and try again.' });
    }

    // Invalidate OTP after successful use — one-time only
    await zite.appBackups.update({
      id: otpRecord.id,
      record: { data: JSON.stringify({ otp: '', expiresAt: 0, username: '' }) },
    });

    // Return the same session token as password login
    const sessionToken = getAdminPassword();
    return { success: true, sessionToken };
  },
});
