import { useState } from 'react';
import { Input } from '@project/components/ui/input';
import { adminSendOtp, adminVerifyOtpChangeCredentials } from 'zitejs/api';
import { toast } from 'sonner';

interface Props { password: string; onCredentialsChanged: () => void; }

type Step = 'form' | 'otp';

export default function AdminCredentials({ password, onCredentialsChanged }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const inp = 'w-full px-4 py-3 bg-background border border-border text-foreground text-sm rounded-xl focus:outline-none focus:border-primary transition-colors font-satoshi';
  const lbl = 'text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block';

  async function handleRequestOtp() {
    setError('');
    if (!newUsername.trim() || newUsername.trim().length < 4) {
      setError('New Admin ID must be at least 4 characters.'); return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('New Password must be at least 8 characters.'); return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    setSendingOtp(true);
    try {
      const result = await adminSendOtp({ password, purpose: 'change' });
      setOtpMessage(result.message);
      setStep('otp');
      toast.success(result.emailSent ? '📧 OTP sent to gclass902@gmail.com' : '⚠️ Email unavailable — OTP shown in message');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP. Try again.');
    } finally { setSendingOtp(false); }
  }

  async function handleVerifyOtp() {
    setError('');
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setVerifying(true);
    try {
      const result = await adminVerifyOtpChangeCredentials({
        otp, newUsername: newUsername.trim(), newPassword,
        purpose: 'change', currentPassword: password,
      });
      toast.success('✅ ' + result.message);
      // Reset form
      setStep('form'); setNewUsername(''); setNewPassword(''); setConfirmPassword(''); setOtp('');
      onCredentialsChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed. Check your OTP and try again.');
    } finally { setVerifying(false); }
  }

  return (
    <div className="space-y-4">
      {/* Security notice */}
      <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
        <p className="text-xs text-emerald-400 font-semibold leading-relaxed">
          🔐 <strong>Secure OTP flow:</strong> A one-time password will be sent to{' '}
          <span className="text-foreground">gclass902@gmail.com</span> to verify your identity before any credential change.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm font-semibold">
          <span>⚠</span> {error}
        </div>
      )}

      {step === 'form' ? (
        <div className="space-y-4">
          <div>
            <label className={lbl}>New Admin ID</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">👤</span>
              <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                placeholder="Min. 4 characters" className={inp + ' pl-10'} maxLength={32} />
            </div>
          </div>
          <div>
            <label className={lbl}>New Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔒</span>
              <Input type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters" className="pl-10 pr-12 bg-background border-border" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm">
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>
          <div>
            <label className={lbl}>Confirm New Password</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔒</span>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password" className="pl-10 bg-background border-border" />
            </div>
          </div>
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs text-muted-foreground">
              <strong className="text-primary">💡 Note:</strong> After changing credentials, you will be logged out and must sign in with your new Admin ID and password.
            </p>
          </div>
          <button onClick={handleRequestOtp} disabled={sendingOtp}
            className="w-full py-3.5 font-syne font-black text-sm text-white bg-gradient-to-r from-primary to-blue-400 rounded-xl transition-all hover:opacity-90 disabled:opacity-60 shadow-lg">
            {sendingOtp ? '📧 Sending OTP...' : '📧 Send OTP to gclass902@gmail.com →'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-background border border-border rounded-xl">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">OTP Status</p>
            <p className="text-sm text-foreground font-semibold">{otpMessage}</p>
          </div>

          <div>
            <label className={lbl}>Enter 6-digit OTP</label>
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="______" className={inp + ' text-center text-2xl font-black tracking-[0.5em]'}
              maxLength={6} inputMode="numeric" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setStep('form'); setOtp(''); setError(''); }}
              className="py-3 font-syne font-black text-sm border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-foreground transition-all">
              ← Back
            </button>
            <button onClick={handleVerifyOtp} disabled={verifying || otp.length !== 6}
              className="py-3 font-syne font-black text-sm text-white bg-gradient-to-r from-primary to-blue-400 rounded-xl transition-all hover:opacity-90 disabled:opacity-60">
              {verifying ? '⏳ Verifying...' : '✅ Confirm Change'}
            </button>
          </div>

          <button onClick={handleRequestOtp} disabled={sendingOtp}
            className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors py-1">
            {sendingOtp ? 'Resending...' : 'Resend OTP'}
          </button>
        </div>
      )}
    </div>
  );
}
