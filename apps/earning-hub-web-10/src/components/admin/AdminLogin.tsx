import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Input } from '@project/components/ui/input';
import { adminLogin } from 'zitejs/api';

interface Props {
  onLogin: (sessionToken: string) => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

function describeError(e: unknown): string {
  const msg = (e instanceof Error ? e.message : '').toLowerCase();
  if (msg.includes('invalid') || msg.includes('unauthorized') || msg.includes('401')) {
    return 'Invalid Admin ID or password.';
  }
  if (msg.includes('not configured')) {
    return 'Admin access is not configured on the server yet.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  return 'Login failed. Please try again.';
}

export default function AdminLogin({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failures, setFailures] = useState(0);
  const [lockedFor, setLockedFor] = useState(0);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Client-side cool-down after repeated failures (convenience, not a security control).
  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => setLockedFor(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  const locked = lockedFor > 0;
  const canSubmit = !loading && !locked && username.trim().length > 0 && password.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const { sessionToken } = await adminLogin({ username: username.trim(), password });
      setFailures(0);
      onLogin(sessionToken);
    } catch (err: unknown) {
      const next = failures + 1;
      setFailures(next);
      setPassword('');
      if (next >= MAX_ATTEMPTS) {
        setFailures(0);
        setLockedFor(LOCKOUT_SECONDS);
        setError(`Too many attempts. Please wait ${LOCKOUT_SECONDS} seconds.`);
      } else {
        setError(describeError(err));
        passwordRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 bg-primary pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-8 bg-blue-400 pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="bg-card border border-border rounded-3xl shadow-2xl shadow-black/30 relative overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-blue-400 to-primary rounded-t-3xl" />

          <form onSubmit={handleSubmit} className="p-8 sm:p-10" noValidate>
            {/* Branding */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg bg-gradient-to-br from-primary to-blue-400">
                💰
              </div>
              <div>
                <span className="font-syne font-black text-xl text-foreground">
                  Earning<span className="text-primary">Hub</span>
                </span>
                <p className="text-xs text-muted-foreground font-semibold">Admin Portal</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="font-syne font-black text-2xl text-foreground mb-1">Admin Login</h2>
              <p className="text-sm text-muted-foreground">Enter your Admin ID and password to continue.</p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl mb-5 text-sm font-semibold animate-in fade-in duration-200"
              >
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                <span>{locked ? `Too many attempts. Try again in ${lockedFor}s.` : error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="admin-id" className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Admin ID
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">👤</span>
                  <Input
                    id="admin-id"
                    type="text"
                    value={username}
                    onChange={ev => setUsername(ev.target.value)}
                    placeholder="Enter Admin ID"
                    className="pl-10 bg-background border-border font-satoshi"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">🔒</span>
                  <Input
                    id="admin-password"
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={ev => setPassword(ev.target.value)}
                    placeholder="Enter password"
                    className="pl-10 pr-12 bg-background border-border font-satoshi"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-4 font-syne font-black text-base rounded-xl transition-all hover:opacity-90 disabled:opacity-60 shadow-lg text-white bg-gradient-to-r from-primary to-blue-400"
              >
                {loading ? '⏳ Signing in...' : locked ? `Locked (${lockedFor}s)` : 'Sign In →'}
              </button>
            </div>

            <p className="mt-6 text-[10px] text-muted-foreground text-center leading-relaxed">
              🔐 Access restricted to authorized administrators.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
