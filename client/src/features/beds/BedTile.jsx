import React from 'react';
import { Ambulance, Lock } from 'lucide-react';
import { StatusIndicator } from '../../components/StatusIndicator';
import { STAFF_BED_STATUSES } from '../../constants/bed';
import { equipmentText } from '../../utils/labels';
import { formatClock } from '../../utils/formatRelative';
import { cn } from '../../utils/cn';

const SEGMENT = {
  AVAILABLE: { label: 'Available', active: 'bg-success border-success text-text-inverse' },
  OCCUPIED: { label: 'Occupied', active: 'bg-text border-text text-text-inverse' },
  CLEANING: { label: 'Cleaning', active: 'bg-warning border-warning text-text-inverse' },
  UNAVAILABLE: { label: 'Unavail', active: 'bg-danger border-danger text-text-inverse' },
};

/**
 * Bed card from the Stitch beds screen: label, equipment, status pill, one-tap status
 * segments (≥ 48 px). RESERVED: chips disabled, "Held for incoming patient · until 10:33".
 */
export function BedTile({ bed, reservation, onChange, pendingStatus, disabled }) {
  const reserved = bed.status === 'RESERVED';
  return (
    <article className={cn('bg-surface border rounded-lg shadow-card p-4', reserved ? 'border-primary/40' : 'border-border')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[18px] font-bold text-text">{bed.label}</h3>
          <p className="text-small text-text-muted">{equipmentText(bed.equipment)}</p>
        </div>
        <StatusIndicator kind="bed" status={bed.status} look="caps" />
      </div>

      {reserved && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md bg-primary-soft border border-primary/20 px-3 py-2 text-small text-primary">
          <span className="inline-flex items-center gap-1.5 font-semibold min-w-0">
            <Ambulance className="w-4 h-4 shrink-0" aria-hidden />
            <span className="truncate">Held for incoming patient</span>
          </span>
          {reservation && <span className="font-semibold tabular-nums shrink-0">until {formatClock(reservation.expiresAt)}</span>}
        </div>
      )}

      <div className="relative mt-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={`Status of ${bed.label}`}>
        {STAFF_BED_STATUSES.map((s) => {
          const active = bed.status === s;
          const loading = pendingStatus === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={reserved || disabled || active}
              onClick={() => onChange(bed, s)}
              className={cn(
                'h-12 rounded-md border text-[13px] font-semibold transition-colors',
                active ? SEGMENT[s].active : 'bg-surface border-border text-text hover:border-border-strong',
                reserved && 'opacity-40',
                loading && 'animate-pulse-gentle',
                !reserved && active && 'disabled:opacity-100 cursor-default'
              )}
            >
              {SEGMENT[s].label}
            </button>
          );
        })}
        {reserved && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded bg-primary-soft border border-primary/20 px-2.5 py-1 text-[12px] font-semibold text-primary">
              <Lock className="w-3.5 h-3.5" aria-hidden /> Locked by reservation
            </span>
          </span>
        )}
      </div>
    </article>
  );
}
