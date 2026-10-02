import React from 'react';
import { CircleAlert, CircleCheckBig, Clock, Lock, Search, Ban } from 'lucide-react';
import { CountdownTimer } from '../../components/CountdownTimer';
import { formatClock } from '../../utils/formatRelative';
import { cn } from '../../utils/cn';

const LOOK = {
  SEARCHING: { icon: Search, cls: 'bg-primary-soft border-primary/30 text-primary', title: 'Finding hospital' },
  AWAITING_HOSPITAL: { icon: Clock, cls: 'bg-primary-soft border-primary/30 text-primary', title: 'Awaiting hospital' },
  RESERVED: { icon: Lock, cls: 'bg-success-soft border-success/30 text-success', title: 'Bed reserved' },
  COMPLETED: { icon: CircleCheckBig, cls: 'bg-success-soft border-success/30 text-success', title: 'Patient arrived' },
  NO_MATCH: { icon: CircleAlert, cls: 'bg-danger-soft border-danger/30 text-danger', title: 'No hospital available' },
  CANCELLED: { icon: Ban, cls: 'bg-neutral-soft border-border text-neutral-state', title: 'Cancelled' },
};

/** Status line → hospital → giant countdown (DESIGN.md §8.2 detail, §8.4). */
export function StatusBanner({ emergency, hospitalName, offsetMs }) {
  const look = LOOK[emergency.status] ?? LOOK.SEARCHING;
  const Icon = look.icon;
  const offer = emergency.currentOffer;
  const reservation = emergency.reservation;

  let detail = null;
  if (emergency.status === 'AWAITING_HOSPITAL') detail = `Waiting for ${hospitalName ?? 'the hospital'} to respond`;
  else if (emergency.status === 'RESERVED' && reservation)
    detail = `${hospitalName ?? 'Hospital'} accepted. Bed ${reservation.bed?.label ?? ''} is held until ${formatClock(reservation.expiresAt)}.`;
  else if (emergency.status === 'SEARCHING') detail = 'Re-ranking with the latest availability…';
  else if (emergency.status === 'NO_MATCH') detail = 'No hospital currently matches all requirements. Adjust requirements or retry.';
  else if (emergency.status === 'COMPLETED') detail = `Patient arrived at ${hospitalName ?? 'the hospital'}.`;
  else if (emergency.status === 'CANCELLED') detail = 'This emergency was cancelled.';

  return (
    <section className={cn('rounded-lg border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4', look.cls)} aria-live="polite">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="w-11 h-11 rounded-full bg-surface flex items-center justify-center shrink-0 shadow-card">
          <Icon className="w-5 h-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-h2">{look.title}</p>
          {detail && <p className="text-body text-text mt-0.5">{detail}</p>}
        </div>
      </div>
      {emergency.status === 'AWAITING_HOSPITAL' && offer?.expiresAt && (
        <div className="sm:text-right sm:min-w-[160px]">
          <p className="text-caption uppercase text-text-muted">Time to respond</p>
          <CountdownTimer expiresAt={offer.expiresAt} offsetMs={offsetMs} totalSeconds={offer.offeredAt ? (new Date(offer.expiresAt) - new Date(offer.offeredAt)) / 1000 : undefined} showBar className="w-full" />
        </div>
      )}
    </section>
  );
}
