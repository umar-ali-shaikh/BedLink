import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { GoogleButton, OrDivider, useAuthConfig } from './GoogleButton';

/** Top of a registration form: "Sign up with Google", or the linked Google account. */
export function GoogleSignupBlock({ google, onCredential, onClear }) {
  const { data } = useAuthConfig();
  if (google?.email) {
    return (
      <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-success/25 bg-success-soft px-3 py-2.5 text-small">
        <span className="inline-flex items-center gap-2 text-text min-w-0">
          <BadgeCheck className="w-4 h-4 text-success shrink-0" aria-hidden />
          <span className="truncate">
            Google account <strong>{google.email}</strong> — no password needed
          </span>
        </span>
        <button type="button" onClick={onClear} className="shrink-0 font-semibold text-text-muted hover:text-text">
          Use email instead
        </button>
      </div>
    );
  }
  if (!data?.googleClientId) return null;
  return (
    <div className="mb-2">
      <GoogleButton onCredential={onCredential} text="signup_with" className="flex justify-center" />
      <OrDivider />
    </div>
  );
}
