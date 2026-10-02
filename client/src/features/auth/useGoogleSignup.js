import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { decodeGoogleCredential } from './GoogleButton';

/**
 * Registration with Google: the credential comes from the login page (router state) or the
 * form's own Google button. Its email/name prefill the form and no password is needed
 * (the server checks the token).
 */
export function useGoogleSignup(onPrefill) {
  const fromLogin = useLocation().state?.google ?? null;
  const [google, setGoogle] = useState(fromLogin);

  const accept = (credential) => {
    const info = decodeGoogleCredential(credential);
    if (!info?.email) return;
    const next = { credential, ...info };
    setGoogle(next);
    onPrefill?.(next);
  };

  return { google, accept, clear: () => setGoogle(null) };
}
