import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from './useAuth';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { HOME_BY_ROLE } from '../../constants/routes';
import { errorMessage } from '../../services/api';

import { config } from '../../config';

/** Quick-fill buttons for seeded demo accounts (VITE_DEMO_ACCOUNTS / VITE_SHOW_DEMO_ACCOUNTS). */
const DEMO_ACCOUNTS = config.demoAccounts;
const SHOW_DEMO = config.showDemoAccounts && DEMO_ACCOUNTS.length > 0;

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const user = await login({ email: email.trim(), password });
      const home = HOME_BY_ROLE[user.role];
      const from = location.state?.from?.pathname;
      const prefix = home.split('/')[1];
      navigate(from && from.startsWith(`/${prefix}/`) ? from : home, { replace: true });
    } catch (err) {
      setError(err.code === 'INVALID_CREDENTIALS' ? 'Invalid email or password.' : errorMessage(err));
      setIsLoading(false);
    }
  };

  const fill = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="w-full max-w-[360px]">
      <div className="bg-surface border border-border rounded-lg shadow-card px-6 pt-6 pb-5">
        <Logo size="lg" />
        <p className="text-small text-text-muted mt-2">Find the right bed. Right now.</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@bedlink.demo"
              className="input h-11"
              aria-invalid={!!error}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input h-11 pr-11"
                aria-invalid={!!error}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded text-text-subtle hover:text-text"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 text-small text-danger bg-danger-soft rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
            <span className="inline-flex items-center gap-2">
              Sign in <ArrowRight className="w-4 h-4" aria-hidden />
            </span>
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-[12px] text-text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" aria-hidden /> Secure session cookie
          </span>
          <span>v{config.appVersion}</span>
        </div>
      </div>

      {SHOW_DEMO && (
        <div className="mt-4 text-center text-small text-text-subtle">
          <p>
            Demo accounts:{' '}
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.label} type="button" onClick={() => fill(a)} className="mx-1.5 font-semibold text-primary hover:underline">
                {a.label}
              </button>
            ))}
          </p>
          <p className="text-[12px] mt-1">Simulated data · hackathon build</p>
        </div>
      )}
    </div>
  );
}
