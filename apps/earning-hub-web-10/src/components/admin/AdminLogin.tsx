import { useState, useEffect } from 'react';
import { Input } from '@project/components/ui/input';
import { adminLogin, adminGoogleLogin } from 'zitejs/api';
import { useAuth, loginWithRedirect, logout } from 'zitejs/auth';

interface Props {
  onLogin: (sessionToken: string) => void;
}

type LoginMode = 'choose' | 'google-step2';

export default function AdminLogin({ onLogin }: Props) {
  const { user, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<LoginMode>('choose');

  // Google 2-step fields
  const [googlePassword, setGooglePassword] = useState('');
  const [showGooglePass, setShowGooglePass] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-detect Google login return: if user is logged in via Google, move to step 2
  useEffect(() => {
    if (!authLoading && user) {
      // Auto-advance to step 2 for any Google-authenticated user
      // The server will reject non-admin emails
      setMode('google-step2');
      setError('');
    }
  }, [user, authLoading]);

  function handleGoogleLogin() {
    loginWithRedirect({ redirectUrl: window.location.pathname + window.location.search });
  }

  function handleMagicLink() {
    loginWithRedirect({ redirectUrl: window.location.pathname + window.location.search });
  }

  async function handleGoogleStep2() {
    if (!googlePassword) {
      setError('Please enter admin password to complete verification.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Step 1: Verify Google identity matches admin email (server-side check)
      await adminGoogleLogin({});
      // Step 2: Verify password with correct admin username
      const { sessionToken } = await adminLogin({ username: 'ranahub902', password: googlePassword });
      onLogin(sessionToken);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('forbidden') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('authorised')) {
        setError('Access denied. This Google account is not authorised for admin access.');
      } else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('password')) {
        setError('Password verification failed. Please enter correct admin password.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogout() {
    logout();
    setMode('choose');
    setError('');
    setGooglePassword('');
  }

  // Display name from Google user
  const displayName = user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';
  const displayInitial = user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-primary pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-8 bg-blue-400 pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-card border border-border rounded-3xl shadow-2xl shadow-black/30 relative overflow-hidden">
          {/* Top gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-primary via-blue-400 to-primary rounded-t-3xl" />

          <div className="p-8 sm:p-10">
            {/* Branding */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg bg-gradient-to-br from-primary to-blue-400">
                💰
              </div>
              <div>
                <span className="font-syne font-black text-xl text-foreground">
                  Earning<span className="text-primary">Hub</span>
                </span>
                <p className="text-xs text-muted-foreground font-semibold">Admin Portal — Secure Login</p>
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-5 text-sm font-semibold animate-in fade-in duration-200">
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* ─── CHOOSE LOGIN METHOD ─── */}
            {mode === 'choose' && (
              <>
                <div className="mb-7">
                  <h2 className="font-syne font-black text-2xl text-foreground mb-1">Admin Login</h2>
                  <p className="text-sm text-muted-foreground">
                    Sign in with your authorized account to access the admin panel.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Google Login — 2-Step */}
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-2.5 py-4 border border-border rounded-xl bg-background hover:bg-muted/40 transition-all font-syne font-black text-sm text-foreground group"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    <span>Sign in with Google</span>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full">
                      2-Step
                    </span>
                  </button>

                  {/* Magic Link */}
                  <button
                    onClick={handleMagicLink}
                    className="w-full flex items-center justify-center gap-2.5 py-4 border border-border rounded-xl bg-background hover:bg-muted/40 transition-all font-syne font-black text-sm text-foreground group"
                  >
                    <span className="text-base">✨</span>
                    <span>Magic Link Login</span>
                  </button>
                </div>

                <div className="mt-6 p-3.5 bg-background/60 border border-border/40 rounded-xl text-center space-y-1">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    🔐 Access restricted to authorized admin account only.
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Unauthorized access is prohibited and logged.
                  </p>
                </div>
              </>
            )}

            {/* ─── GOOGLE 2-STEP: PASSWORD VERIFICATION ─── */}
            {mode === 'google-step2' && (
              <>
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔐</span>
                    <h2 className="font-syne font-black text-2xl text-foreground">Step 2: Verify Password</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Identity confirmed. Enter admin password to complete login.
                  </p>
                </div>

                {/* Step progress */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center gap-1.5">
                    <span className="w-7 h-7 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center text-xs font-black text-green-400">✓</span>
                    <span className="text-xs font-black text-green-400">Google</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gradient-to-r from-green-500 to-primary rounded" />
                  <div className="flex items-center gap-1.5">
                    <span className="w-7 h-7 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-xs font-black text-primary status-emoji-pulse">2</span>
                    <span className="text-xs font-black text-primary">Password</span>
                  </div>
                </div>

                {/* Google user info — shows name only, no email */}
                {user && (
                  <div className="flex items-center gap-3 p-3.5 bg-green-500/5 border border-green-500/25 rounded-xl mb-5">
                    {user.image ? (
                      <img src={user.image} alt="" className="w-10 h-10 rounded-full border-2 border-green-500/40" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-500/20 border-2 border-green-500/40 flex items-center justify-center text-lg font-black text-green-400">
                        {displayInitial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground truncate">{displayName}</p>
                      <p className="text-[11px] text-green-400 font-bold flex items-center gap-1">
                        <span className="status-emoji-bounce text-xs">✅</span> Google verified
                      </p>
                    </div>
                    <button onClick={handleGoogleLogout} className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                      ✕ Switch
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Admin Password (Step 2)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔒</span>
                      <Input
                        type={showGooglePass ? 'text' : 'password'}
                        value={googlePassword}
                        onChange={e => setGooglePassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleGoogleStep2()}
                        placeholder="Enter admin password"
                        className="pl-10 pr-12 bg-background border-border font-satoshi"
                        autoComplete="current-password"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowGooglePass(s => !s)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                        tabIndex={-1}
                      >
                        {showGooglePass ? '🙈' : '👁'}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      🛡️ 2-step verification: Google identity + admin password required
                    </p>
                  </div>

                  <button
                    onClick={handleGoogleStep2}
                    disabled={loading || !googlePassword}
                    className="w-full py-4 font-syne font-black text-base rounded-xl transition-all hover:opacity-90 disabled:opacity-60 shadow-lg text-white bg-gradient-to-r from-green-500 to-emerald-400"
                  >
                    {loading ? '⏳ Verifying...' : '🔐 Verify & Access Admin →'}
                  </button>

                  <button
                    onClick={handleGoogleLogout}
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    ← Back to login options
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Feature badges — no email shown */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {[
            '🔐 Google 2-Step',
            '✨ Magic Link',
            '🔒 Authorized Only',
          ].map(badge => (
            <span key={badge} className="text-[10px] font-bold px-2.5 py-1 bg-card border border-border rounded-full text-muted-foreground">
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
