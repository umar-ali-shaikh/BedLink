import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CircleX, Hourglass } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { ROUTES } from '../../constants/routes';
import { useAccountVerification } from '../verification/useAccountVerification';

const POLL_MS = 30_000;

/**
 * Shown to hospitals that are not verified yet (or were rejected). Re-checks the status
 * every 30 s so the panel unlocks as soon as BedLink verifies the hospital.
 */
export function VerificationBanner() {
  const { user, refreshUser } = useAuth();
  const status = user?.hospital?.verificationStatus;
  useAccountVerification();

  useEffect(() => {
    if (status !== 'PENDING') return undefined;
    const t = setInterval(() => refreshUser().catch(() => {}), POLL_MS);
    return () => clearInterval(t);
  }, [status, refreshUser]);

  if (status === 'PENDING') {
    return (
      <div className="mb-4 rounded-lg border border-warning/30 bg-warning-soft p-4 text-small text-text" role="status">
        <p className="flex items-center gap-2 font-semibold text-warning">
          <Hourglass className="w-4 h-4" aria-hidden /> Verification pending
        </p>
        <p className="mt-1">
          We're checking registration <strong>{user.hospital.registrationNumber}</strong>. Ambulances can't see your hospital or send requests until it's
          verified. Meanwhile, <Link to={ROUTES.HOSPITAL_BEDS} className="font-semibold text-primary hover:underline">add your beds</Link> so you're ready.
        </p>
      </div>
    );
  }
  if (status === 'REJECTED') {
    return (
      <div className="mb-4 rounded-lg border border-danger/30 bg-danger-soft p-4 text-small text-text" role="alert">
        <p className="flex items-center gap-2 font-semibold text-danger">
          <CircleX className="w-4 h-4" aria-hidden /> Registration not approved
        </p>
        <p className="mt-1">{user.hospital.verificationNote || 'Your registration could not be verified.'} Contact the BedLink team with your registration certificate to appeal.</p>
      </div>
    );
  }
  return null;
}
