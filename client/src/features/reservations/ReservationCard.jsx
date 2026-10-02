import React from 'react';
import { BedDouble, Lock, Phone } from 'lucide-react';
import { CountdownTimer } from '../../components/CountdownTimer';
import { Button } from '../../components/Button';
import { equipmentText } from '../../utils/labels';
import { formatClock } from '../../utils/formatRelative';

/** Held bed: label, hospital, "Held until 10:33" + hold countdown, role actions (DESIGN.md §5). */
export function ReservationCard({ reservation, hospitalName, patientRef, offsetMs = 0, actions, compact, caller }) {
  if (!reservation) return null;
  const bed = reservation.bed;
  return (
    <article className="bg-surface border border-primary/30 rounded-lg shadow-card p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
            <BedDouble className="w-5 h-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-h3 text-text">
              Bed {bed?.label ?? '—'}
              {hospitalName && <span className="text-text-muted font-normal"> · {hospitalName}</span>}
            </p>
            <p className="text-small text-text-muted">
              {patientRef ? `Patient ${patientRef} · ` : ''}
              {bed ? equipmentText(bed.equipment) : ''}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary bg-primary-soft border border-primary/20 rounded-full px-2 py-0.5 shrink-0">
          <Lock className="w-3 h-3" aria-hidden /> Reserved
        </span>
      </div>
      {caller && (
        <p className="mt-3 text-small text-text" data-testid="reservation-caller">
          Caller {caller.name} ·{' '}
          <a href={`tel:${caller.phone}`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            <Phone className="w-3.5 h-3.5" aria-hidden /> {caller.phone}
          </a>
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption uppercase text-text-subtle">Held until {formatClock(reservation.expiresAt)}</p>
          <CountdownTimer expiresAt={reservation.expiresAt} offsetMs={offsetMs} size={compact ? 'md' : 'lg'} tone="text-primary" />
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </article>
  );
}

export function ReservationActions({ onArrive, onRelease, isArriving, isReleasing, size = 'md' }) {
  return (
    <>
      {onRelease && (
        <Button variant="danger" size={size} onClick={onRelease} isLoading={isReleasing} disabled={isArriving}>
          Release
        </Button>
      )}
      {onArrive && (
        <Button variant="success" size={size} onClick={onArrive} isLoading={isArriving} disabled={isReleasing}>
          Mark arrived
        </Button>
      )}
    </>
  );
}
