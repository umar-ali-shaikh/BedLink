import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Ambulance, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from './useAuth';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { HOME_BY_ROLE, ROUTES } from '../../constants/routes';
import { errorMessage } from '../../services/api';

import { config } from '../../config';

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
      goHome(await login({ email: email.trim(), password }));
    } catch (err) {
      setError(err.code === 'INVALID_CREDENTIALS' ? 'Invalid email or password.' : errorMessage(err));
      setIsLoading(false);
    }
  };

  const goHome = (user) => {
    const home = HOME_BY_ROLE[user.role];
    const from = location.state?.from?.pathname;
    const prefix = home.split('/')[1];
    return navigate(from && from.startsWith(`/${prefix}/`) ? from : home, { replace: true });
  };

  return (
    <div className="w-full max-w-[360px]">
      <div className="bg-surface border border-border rounded-lg shadow-card px-6 pt-6 pb-5">
        <Logo size="lg" />
        <p className="text-small text-text-muted mt-2">Find the right bed. Right now.</p>
        <Link
          to={ROUTES.BOOK}
          data-testid="book-ambulance-cta"
          className="mt-5 flex items-center justify-center gap-2 h-12 rounded-lg bg-danger text-text-inverse text-base font-semibold shadow-sm hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
        >
          <Ambulance className="w-5 h-5" aria-hidden /> Book an ambulance
        </Link>
        <p className="mt-1.5 text-center text-[12px] text-text-subtle">For patients and families — no login needed</p>
        <div className="mt-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-text-subtle" aria-hidden>
          <span className="h-px flex-1 bg-border" /> Crew &amp; hospital sign in <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
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
              placeholder="you@example.com"
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

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link to={ROUTES.REGISTER_AMBULANCE} className="h-10 px-2 rounded-md border border-border text-[13px] font-semibold text-text flex items-center justify-center hover:border-primary hover:text-primary">
            Register ambulance
          </Link>
          <Link to={ROUTES.REGISTER_HOSPITAL} className="h-10 px-2 rounded-md border border-border text-[13px] font-semibold text-text flex items-center justify-center hover:border-primary hover:text-primary">
            Register hospital
          </Link>
        </div>

        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-[12px] text-text-subtle">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" aria-hidden /> Secure session cookie
          </span>
          <span>v{config.appVersion}</span>
        </div>
      </div>

    </div>
  );
}
