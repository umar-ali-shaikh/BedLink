import React from 'react';
import { CircleX, Hourglass } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useAccountVerification } from './useAccountVerification';

export const isVerifiedAmbulance = (user) => user?.role !== 'DISPATCHER' || user?.verificationStatus === 'VERIFIED';

/** Pending / rejected notice for ambulance accounts; updates live when an admin decides. */
export function AmbulanceVerificationBanner() {
  const { user } = useAuth();
  useAccountVerification();
  if (isVerifiedAmbulance(user)) return null;
  const rejected = user.verificationStatus === 'REJECTED';
  return (
    <div
      className={`mb-5 rounded-lg border p-4 text-small text-text ${rejected ? 'border-danger/30 bg-danger-soft' : 'border-warning/30 bg-warning-soft'}`}
      role={rejected ? 'alert' : 'status'}
    >
      <p className={`flex items-center gap-2 font-semibold ${rejected ? 'text-danger' : 'text-warning'}`}>
        {rejected ? <CircleX className="w-4 h-4" aria-hidden /> : <Hourglass className="w-4 h-4" aria-hidden />}
        {rejected ? 'Registration not approved' : 'Verification pending'}
      </p>
      <p className="mt-1">
        {rejected
          ? `${user.ambulance?.verificationNote || 'Your ambulance could not be verified.'} Contact the BedLink team to appeal.`
          : `We're checking ambulance ${user.ambulance?.vehicleNumber ?? ''}. You can look around, but requesting beds unlocks once an admin verifies you — this page updates by itself.`}
      </p>
    </div>
  );
}
