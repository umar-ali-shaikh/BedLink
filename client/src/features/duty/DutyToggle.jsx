import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { LocateFixed, LocateOff } from 'lucide-react';
import { dutyApi } from '../booking/api';
import { GPS_STATE } from './useDutyLocationSharing';
import { useAuth } from '../auth/useAuth';
import { isVerifiedAmbulance } from '../verification/AmbulanceVerificationBanner';
import { unlockAudio } from '../hospital/alertSound';
import { Card } from '../../components/Card';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../services/api';
import { useNow } from '../../hooks/useNow';
import { formatRelativeTime } from '../../utils/formatRelative';
import { cn } from '../../utils/cn';

const GPS_TEXT = {
  [GPS_STATE.WAITING]: 'Waiting for a GPS fix…',
  [GPS_STATE.SHARING]: 'Sharing your live location',
  [GPS_STATE.DENIED]: 'Location permission is blocked — allow it in the browser to receive bookings.',
  [GPS_STATE.UNSUPPORTED]: 'This device cannot share its location, so you cannot receive bookings.',
};

/**
 * "On duty" switch (ambulance panel). While on, the page shares GPS (useDutyLocationSharing)
 * and the nearest verified on-duty ambulance is offered public bookings.
 */
export function DutyToggle({ gps }) {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const now = useNow(1000);
  const verified = isVerifiedAmbulance(user);
  const onDuty = !!user?.ambulance?.onDuty;
  const toggle = useMutation({
    mutationFn: () => dutyApi.set(!onDuty),
    onSuccess: async (data) => {
      await refreshUser();
      showToast({
        type: data.onDuty ? 'success' : 'info',
        title: data.onDuty ? 'You are on duty' : 'You are off duty',
        message: data.onDuty ? 'You will be offered ambulance bookings near you.' : 'You will not receive new bookings.',
      });
    },
    onError: (err) => showToast({ type: 'error', title: 'Could not change duty status', message: errorMessage(err) }),
  });
  const problem = onDuty && [GPS_STATE.DENIED, GPS_STATE.UNSUPPORTED].includes(gps.state);
  const Icon = problem ? LocateOff : LocateFixed;
  return (
    <Card className="mb-5 flex flex-wrap items-center justify-between gap-3" data-testid="duty-card">
      <div className="flex items-start gap-3 min-w-0">
        <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', problem ? 'text-danger' : onDuty ? 'text-success' : 'text-text-subtle')} aria-hidden />
        <div className="min-w-0">
          <p className="text-small font-semibold text-text">{onDuty ? 'On duty' : 'Off duty'}</p>
          <p className={cn('text-small', problem ? 'text-danger' : 'text-text-muted')} role="status">
            {!verified
              ? 'Available once an admin verifies your ambulance.'
              : onDuty
                ? `${GPS_TEXT[gps.state] ?? ''}${gps.lastSentAt ? ` · sent ${formatRelativeTime(gps.lastSentAt, now)}` : ''}`
                : 'Go on duty to receive ambulance bookings near you. Your live location is shared while on duty.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={onDuty}
        aria-label="On duty"
        data-testid="duty-switch"
        disabled={!verified || toggle.isPending}
        onClick={() => {
          unlockAudio(); // this click is the user gesture browsers require before alert sounds
          toggle.mutate();
        }}
        className={cn(
          'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
          onDuty ? 'bg-success border-success' : 'bg-neutral-soft border-border-strong'
        )}
      >
        <span className={cn('inline-block h-6 w-6 rounded-full bg-surface shadow transition-transform', onDuty ? 'translate-x-7' : 'translate-x-1')} />
      </button>
    </Card>
  );
}
