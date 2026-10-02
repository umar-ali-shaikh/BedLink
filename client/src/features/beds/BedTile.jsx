import React from 'react';
import { Lock, Wind, Activity, HeartPulse, Check, Sparkles, User, CircleSlash } from 'lucide-react';
import { BED_STATUS } from '../../constants/bed';
import { FreshnessIndicator } from '../../components/FreshnessIndicator';
import { cn } from '../../utils/cn';

const statusChips = [
  { status: BED_STATUS.AVAILABLE, label: 'Available', icon: Check, color: 'hover:bg-success/10 hover:border-success text-success' },
  { status: BED_STATUS.OCCUPIED, label: 'Occupied', icon: User, color: 'hover:bg-neutral-state/10 hover:border-neutral-state text-neutral-state' },
  { status: BED_STATUS.CLEANING, label: 'Cleaning', icon: Sparkles, color: 'hover:bg-warning/10 hover:border-warning text-warning' },
  { status: BED_STATUS.UNAVAILABLE, label: 'Unavailable', icon: CircleSlash, color: 'hover:bg-danger/10 hover:border-danger text-danger' },
];

export function BedTile({ bed, onStatusChange, isUpdating = false }) {
  const isReserved = bed.status === BED_STATUS.RESERVED;

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all duration-150',
        isReserved
          ? 'bg-primary-soft/40 border-primary shadow-sm'
          : 'bg-surface border-border hover:border-border-strong shadow-card'
      )}
    >
      {/* Header: Bed Number & Equipment */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-text tabular-nums">{bed.bedNumber}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-muted text-text-muted border border-border">
              {bed.type}
            </span>
          </div>
          <div className="mt-1">
            <FreshnessIndicator timestamp={bed.updatedAt} />
          </div>
        </div>

        {/* Equipment icons */}
        <div className="flex items-center gap-1 text-text-subtle">
          {bed.equipment?.includes('VENTILATOR') && (
            <span title="Ventilator equipped" className="p-1 rounded bg-neutral-soft text-primary">
              <Wind className="w-3.5 h-3.5" />
            </span>
          )}
          {bed.equipment?.includes('CARDIAC_MONITOR') && (
            <span title="Cardiac monitor" className="p-1 rounded bg-neutral-soft text-danger">
              <HeartPulse className="w-3.5 h-3.5" />
            </span>
          )}
          {bed.equipment?.includes('OXYGEN') && (
            <span title="Oxygen supply" className="p-1 rounded bg-neutral-soft text-success">
              <Activity className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Reserved State */}
      {isReserved ? (
        <div className="mt-3 p-3 rounded-lg bg-primary text-text-inverse flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 flex-shrink-0 animate-pulse" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Locked for Reservation</p>
              <p className="text-[11px] text-primary-soft">
                Held for incoming patient {bed.reservationHoldUntil ? `· until ${new Date(bed.reservationHoldUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">LOCKED</span>
        </div>
      ) : (
        /* Status Chips Row with touch target >= 48px */
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {statusChips.map((chip) => {
            const isCurrent = bed.status === chip.status;
            const Icon = chip.icon;
            return (
              <button
                key={chip.status}
                type="button"
                disabled={isUpdating}
                onClick={() => onStatusChange(bed._id, chip.status)}
                className={cn(
                  'min-h-[48px] px-2 py-2 rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition-all',
                  isCurrent
                    ? 'bg-text text-text-inverse border-text shadow-sm'
                    : `bg-surface border-border text-text-muted ${chip.color} active:scale-95`
                )}
              >
                <Icon className={cn('w-4 h-4', isCurrent ? 'text-text-inverse' : '')} />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
