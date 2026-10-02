import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from './api';

const SCRIPT = 'https://accounts.google.com/gsi/client';
let loader = null;

function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => {
      loader = null;
      reject(new Error('Google sign-in could not load'));
    };
    document.head.appendChild(s);
  });
  return loader;
}

/** Decode the (already server-verified later) Google ID token payload for prefilling forms. */
export function decodeGoogleCredential(credential) {
  try {
    const part = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(decodeURIComponent(escape(atob(part))));
    return { email: json.email, name: json.name ?? '' };
  } catch {
    return null;
  }
}

/** Server-driven auth settings (Google client ID, email verification mode). */
export function useAuthConfig() {
  return useQuery({ queryKey: ['auth', 'config'], queryFn: authApi.config, staleTime: Infinity, retry: 1 });
}

/**
 * Official "Sign in with Google" button (Google Identity Services). Renders nothing when the
 * server has no GOOGLE_CLIENT_ID. `onCredential(idToken)` gets the ID token for the API.
 */
export function GoogleButton({ onCredential, text = 'continue_with', className }) {
  const { data } = useAuthConfig();
  const clientId = data?.googleClientId;
  const ref = useRef(null);
  const handler = useRef(onCredential);
  handler.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clientId || !ref.current) return undefined;
    let cancelled = false;
    loadGoogle()
      .then(() => {
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => res?.credential && handler.current(res.credential),
          ux_mode: 'popup',
          auto_select: false,
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'center',
          width: Math.min(ref.current.offsetWidth || 320, 400),
        });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [clientId, text]);

  if (!clientId) return null;
  if (failed) return <p className="text-[12px] text-text-subtle text-center">Google sign-in is unavailable right now.</p>;
  return <div ref={ref} className={className} style={{ minHeight: 44 }} />;
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-4 text-[12px] text-text-subtle" aria-hidden>
      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
    </div>
  );
}
