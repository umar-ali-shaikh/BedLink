import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { ROUTES } from '../../constants/routes';
import { cn } from '../../utils/cn';

/** Card layout shared by the registration screens. */
export function RegisterShell({ title, subtitle, children, wide = false, back = ROUTES.LOGIN }) {
  return (
    <div className={cn('w-full', wide ? 'max-w-[720px]' : 'max-w-[440px]')}>
      <Link to={back} className="inline-flex items-center gap-1 text-small font-medium text-text-muted hover:text-text mb-3">
        <ArrowLeft className="w-4 h-4" aria-hidden /> Back
      </Link>
      <div className="bg-surface border border-border rounded-lg shadow-card px-5 sm:px-7 pt-6 pb-6">
        <Logo />
        <h1 className="text-h2 text-text mt-5">{title}</h1>
        {subtitle && <p className="text-small text-text-muted mt-1">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-4 text-center text-small text-text-subtle">
        Already registered?{' '}
        <Link to={ROUTES.LOGIN} className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

/** Labelled input with an inline error. */
export function Field({ id, label, error, hint, optional, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {optional && <span className="normal-case tracking-normal text-text-subtle">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-[12px] text-danger" id={`${id}-error`}>
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-[12px] text-text-subtle">{hint}</p>
      )}
    </div>
  );
}

/** Map server `details: [{ path, message }]` onto form field ids. */
export function serverFieldErrors(err, pathToField = (p) => p) {
  const out = {};
  (err?.details ?? []).forEach((d) => {
    // Validation errors come as `body.hospital.name`; business errors as `hospital.name`.
    const raw = (Array.isArray(d.path) ? d.path.join('.') : String(d.path ?? '')).replace(/^body\./, '');
    const key = pathToField(raw);
    if (key && !out[key]) out[key] = d.message;
  });
  return out;
}

export const PASSWORD_RULE = (pw) =>
  pw.length < 8 ? 'At least 8 characters' : !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? 'Use letters and at least one number' : null;
