import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { authApi } from '../features/auth/api';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { FullPageLoader } from '../app/ProtectedRoute';
import { HOME_BY_ROLE, ROUTES } from '../constants/routes';
import { errorMessage } from '../services/api';
import { cn } from '../utils/cn';

const COOLDOWN = 60;

/** 6-digit email code after self-registration. The panel stays locked until it's confirmed. */
export function VerifyEmailPage() {
  const { user, isLoading, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(COOLDOWN);
  const inputRef = useRef(null);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  if (user.emailVerified !== false) return <Navigate to={HOME_BY_ROLE[user.role] ?? ROUTES.LOGIN} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await authApi.verifyEmail(code);
      const fresh = await refreshUser();
      navigate(HOME_BY_ROLE[fresh.role], { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
      inputRef.current?.focus();
      setBusy(false);
    }
  };

  const resend = async () => {
    setError('');
    setInfo('');
    try {
      await authApi.sendEmailCode();
      setInfo(`New code sent to ${user.email}.`);
      setWait(COOLDOWN);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-bg">
      <div className="w-full max-w-[400px] bg-surface border border-border rounded-lg shadow-card px-6 pt-6 pb-5">
        <Logo />
        <div className="mt-6 w-12 h-12 rounded-full bg-primary-soft text-primary flex items-center justify-center">
          <MailCheck className="w-6 h-6" aria-hidden />
        </div>
        <h1 className="text-h2 text-text mt-4">Check your email</h1>
        <p className="text-small text-text-muted mt-1">
          We sent a 6-digit code to <strong className="text-text">{user.email}</strong>. Enter it to finish signing up. Check spam if it's not there.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <label htmlFor="code" className="sr-only">
            Verification code
          </label>
          <input
            ref={inputRef}
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={cn('input h-14 text-center text-[28px] font-bold tracking-[0.5em] tabular-nums', error && 'border-danger')}
            placeholder="••••••"
            aria-invalid={!!error}
          />
          {error && (
            <p role="alert" className="text-small text-danger bg-danger-soft rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {info && <p className="text-small text-success">{info}</p>}
          <Button type="submit" size="lg" className="w-full" isLoading={busy} disabled={code.length !== 6}>
            Verify email
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-small">
          <button type="button" onClick={resend} disabled={wait > 0} className="inline-flex items-center gap-1.5 font-semibold text-primary disabled:text-text-subtle">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden /> {wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate(ROUTES.LOGIN, { replace: true });
            }}
            className="font-medium text-text-muted hover:text-text"
          >
            Wrong email? Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
