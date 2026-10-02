import React from 'react';
import { Ban, Check, Circle, CircleAlert, Loader2, Phone } from 'lucide-react';
import { HOSPITAL_STATE, BOOKING_STATUS as S } from '../../constants/booking';
import { BED_TYPE_LABELS } from '../../constants/bed';
import { cn } from '../../utils/cn';
import { formatDistance, formatEta } from '../../utils/formatEta';
import { formatClock } from '../../utils/formatRelative';

const STATE_STYLE = {
  done: { icon: Check, ring: 'bg-success text-text-inverse border-success' },
  current: { icon: Loader2, ring: 'bg-primary-soft text-primary border-primary' },
  failed: { icon: CircleAlert, ring: 'bg-danger-soft text-danger border-danger' },
  pending: { icon: Circle, ring: 'bg-surface text-text-subtle border-border' },
};

const after = (status, list) => list.includes(status);

/** Steps shown to the caller, derived from the booking status and the hospital stage. */
export function buildSteps(view) {
  const { status } = view;
  const h = view.hospital ?? { state: HOSPITAL_STATE.NONE };
  const cancelled = status === S.CANCELLED;
  const assigned = after(status, [S.AMBULANCE_ASSIGNED, S.ON_THE_WAY, S.AT_PICKUP, S.COMPLETED]);
  const hospitalLive = [HOSPITAL_STATE.SEARCHING, HOSPITAL_STATE.CONTACTING].includes(h.state);
  const hospitalDone = [HOSPITAL_STATE.ACCEPTED, HOSPITAL_STATE.ARRIVED].includes(h.state);
  const live = (condition) => (condition && !cancelled ? 'current' : 'pending');

  return [
    {
      id: 'finding',
      title: 'Finding an ambulance',
      detail: status === S.NO_AMBULANCE ? 'No ambulance is available near you right now.' : null,
      state: assigned || (cancelled && view.assignedAt) ? 'done' : status === S.NO_AMBULANCE ? 'failed' : live(status === S.FINDING_AMBULANCE),
      time: view.createdAt,
    },
    {
      id: 'assigned',
      title: 'Ambulance assigned',
      detail: view.ambulance ? <CrewDetail ambulance={view.ambulance} /> : null,
      state: assigned ? 'done' : 'pending',
      time: view.assignedAt,
    },
    {
      id: 'onway',
      title: 'On the way',
      detail: status === S.ON_THE_WAY && view.ambulance?.etaMinutes ? `About ${formatEta(view.ambulance.etaMinutes)} away` : null,
      state: after(status, [S.AT_PICKUP, S.COMPLETED]) ? 'done' : live(status === S.ON_THE_WAY),
      time: view.onTheWayAt,
    },
    {
      id: 'reached',
      title: 'Ambulance has reached you',
      state: status === S.COMPLETED || status === S.AT_PICKUP ? 'done' : 'pending',
      time: view.atPickupAt,
    },
    {
      id: 'contacting',
      title: 'Hospital being contacted',
      detail: hospitalLive && h.name ? `Asking ${h.name} to hold a bed` : h.state === HOSPITAL_STATE.NO_MATCH ? 'No hospital can take the patient right now. The crew is handling it.' : null,
      state: hospitalDone ? 'done' : h.state === HOSPITAL_STATE.NO_MATCH ? 'failed' : live(hospitalLive),
    },
    {
      id: 'accepted',
      title: 'Hospital accepted',
      detail: hospitalDone ? <HospitalDetail hospital={h} /> : null,
      state: hospitalDone ? 'done' : 'pending',
    },
    {
      id: 'arrived',
      title: 'Patient arrived',
      state: status === S.COMPLETED ? 'done' : 'pending',
      time: status === S.COMPLETED ? view.closedAt : null,
    },
  ];
}

function CrewDetail({ ambulance }) {
  return (
    <span className="block space-y-0.5">
      <span className="block">
        <strong className="tabular-nums">{ambulance.vehicleNumber}</strong> · {ambulance.ambulanceType}
        {ambulance.organization ? ` · ${ambulance.organization}` : ''}
      </span>
      {ambulance.phone && (
        <a href={`tel:${ambulance.phone}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <Phone className="w-3.5 h-3.5" aria-hidden /> Call the crew {ambulance.phone}
        </a>
      )}
    </span>
  );
}

function HospitalDetail({ hospital }) {
  return (
    <span className="block space-y-0.5">
      <span className="block">
        <strong>{hospital.name}</strong>
        {hospital.address ? ` · ${hospital.address}` : ''}
      </span>
      <span className="block">
        {BED_TYPE_LABELS[hospital.bedType] ?? hospital.bedType} bed held until <strong className="tabular-nums">{formatClock(hospital.heldUntil)}</strong>
        {hospital.etaMinutes != null && (
          <>
            {' '}
            · est. {formatEta(hospital.etaMinutes)} from you to the hospital ({formatDistance(hospital.distanceKm)})
          </>
        )}
      </span>
    </span>
  );
}

/** Vertical status timeline. Status is never colour alone: each step has an icon and text. */
export function BookingTimeline({ view }) {
  const steps = buildSteps(view);
  const cancelled = view.status === S.CANCELLED;
  return (
    <ol className="relative" aria-label="Booking progress">
      {steps.map((step, i) => {
        const { icon: Icon, ring } = STATE_STYLE[step.state];
        const last = i === steps.length - 1 && !cancelled;
        return (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0" aria-current={step.state === 'current' ? 'step' : undefined} data-step={step.id} data-state={step.state}>
            {!last && <span className={cn('absolute left-[13px] top-7 bottom-0 w-px', step.state === 'done' ? 'bg-success/50' : 'bg-border')} aria-hidden />}
            <span className={cn('relative z-[1] w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0', ring)}>
              <Icon className={cn('w-3.5 h-3.5', step.state === 'current' && 'animate-spin')} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn('text-small font-semibold', step.state === 'pending' ? 'text-text-subtle' : 'text-text')}>
                {step.title}
                {step.time && step.state === 'done' && <span className="ml-2 font-normal text-text-subtle tabular-nums">{formatClock(step.time)}</span>}
                <span className="sr-only"> — {step.state === 'done' ? 'done' : step.state === 'current' ? 'in progress' : step.state === 'failed' ? 'problem' : 'not yet'}</span>
              </p>
              {step.detail && <p className="mt-0.5 text-small text-text-muted">{step.detail}</p>}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="relative flex gap-3 pt-5" data-step="cancelled" data-state="failed">
          <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 bg-neutral-soft text-neutral-state border-neutral-state/40">
            <Ban className="w-3.5 h-3.5" aria-hidden />
          </span>
          <div className="pt-0.5">
            <p className="text-small font-semibold text-text">
              Booking cancelled {view.closedAt && <span className="ml-1 font-normal text-text-subtle tabular-nums">{formatClock(view.closedAt)}</span>}
            </p>
            <p className="mt-0.5 text-small text-text-muted">Any ambulance request and held hospital bed have been released.</p>
          </div>
        </li>
      )}
    </ol>
  );
}
