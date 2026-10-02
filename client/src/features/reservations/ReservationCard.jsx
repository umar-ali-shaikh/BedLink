import React from 'react';
import { Lock, Building2, UserCheck, Ban, Clock } from 'lucide-react';
import { CountdownTimer } from '../../components/CountdownTimer';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';

export function ReservationCard({
  reservation,
  onRelease,
  onMarkArrived,
  isReleasing = false,
  isArriving = false,
  role = 'DISPATCHER',
  className,
}) {
  if (!reservation) return null;

  const bedLabel = reservation.bed?.bedNumber || reservation.bedNumber || 'Assigned Bed';
  const hospitalName = reservation.hospital?.name || 'Assigned Hospital';
  const holdUntil = reservation.expiresAt || reservation.holdExpiresAt;

  return (
    <div
      className={cn(
        'bg-surface border-2 border-primary rounded-xl p-5 shadow-raised overflow-hidden relative',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary-soft text-primary">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              CONFIRMED EMERGENCY BED RESERVATION
            </span>
            <h3 className="text-base font-bold text-text">{hospitalName}</h3>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success-soft text-success border border-success/20">
          RESERVED & LOCKED
        </span>
      </div>

      <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-surface-muted border border-border">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
            Assigned Bed Identifier
          </span>
          <span className="text-lg font-bold text-text tabular-nums">{bedLabel}</span>
          <span className="text-xs text-text-muted block mt-0.5">
            Locked exclusively for incoming patient
          </span>
        </div>

        <div className="p-3 rounded-lg bg-surface-muted border border-border">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
            Guaranteed Hold Expiry
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <Clock className="w-4 h-4 text-warning" />
            <CountdownTimer expiresAt={holdUntil} size="md" />
          </div>
          <span className="text-[11px] text-text-subtle block mt-0.5">
            Auto-releases if patient does not arrive
          </span>
        </div>
      </div>

      {/* Role-specific Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
        {onRelease && (
          <Button
            variant="danger"
            size="sm"
            icon={Ban}
            isLoading={isReleasing}
            onClick={() => onRelease(reservation._id)}
          >
            Release Bed Hold
          </Button>
        )}

        {onMarkArrived && (
          <Button
            variant="success"
            size="sm"
            icon={UserCheck}
            isLoading={isArriving}
            onClick={() => onMarkArrived(reservation._id)}
          >
            Mark Patient Arrived
          </Button>
        )}
      </div>
    </div>
  );
}
