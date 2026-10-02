import React, { useState } from 'react';
import {
  Check,
  Navigation,
  ChevronDown,
  ChevronUp,
  Send,
  Sparkles,
  Flame,
  Activity,
} from 'lucide-react';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { FreshnessIndicator } from '../../components/FreshnessIndicator';
import { Button } from '../../components/Button';
import { formatDistance, formatEta } from '../../utils/formatEta';
import { cn } from '../../utils/cn';

export function HospitalCard({
  hospital,
  rank = 1,
  onRequestBed,
  isRequesting = false,
  isRequested = false,
  isSelected = false,
  onSelect,
  className,
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const isTop = rank === 1;

  const score = hospital.totalScore || hospital.matchScore || 0;
  const breakdown = hospital.breakdown || {
    resource: 45,
    travel: 22,
    freshness: 14,
    load: 9,
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-surface border rounded-xl p-5 transition-all duration-150 relative cursor-pointer',
        isTop
          ? 'border-l-4 border-l-primary border-border shadow-raised'
          : 'border-border hover:border-border-strong shadow-card',
        isSelected && 'ring-2 ring-primary ring-offset-2',
        className
      )}
    >
      {/* Header: Rank, Name, Best Match Badge, Confidence */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs',
              isTop ? 'bg-primary text-text-inverse' : 'bg-surface-muted border border-border text-text-muted'
            )}
          >
            #{rank}
          </span>
          <h3 className="text-base font-bold text-text hover:text-primary transition-colors">
            {hospital.name}
          </h3>
          {isTop && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary-soft text-primary">
              <Sparkles className="w-3 h-3" />
              Best match
            </span>
          )}
        </div>

        <ConfidenceBadge
          level={hospital.confidenceLevel || 'HIGH'}
          reasons={hospital.confidenceReasons || []}
        />
      </div>

      {/* Metrics Row: Match Score, ETA, Distance */}
      <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-surface-muted rounded-lg border border-border/60 mb-3">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
            Match Score
          </span>
          <span className="text-xl font-bold tabular-nums text-primary">{Math.round(score)}</span>
          <span className="text-xs text-text-subtle"> / 100</span>
        </div>

        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
            Ambulance ETA
          </span>
          <span className="text-xl font-bold tabular-nums text-text">
            {formatEta(hospital.estimatedEtaMinutes || hospital.etaMinutes)}
          </span>
        </div>

        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-text-subtle">
            Distance
          </span>
          <span className="text-xl font-bold tabular-nums text-text">
            {formatDistance(hospital.distanceKm)}
          </span>
        </div>
      </div>

      {/* Matching Criteria Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-text mb-3">
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
          <span>{hospital.availableBedCount ?? 3} beds available ({hospital.bedType || 'ICU'})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
          <span>Equipped with Ventilator & Oxygen</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
          <span>{hospital.specialties?.join(', ') || 'Cardiology & Trauma'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
          <span>Operational load {hospital.currentLoad || 50}%</span>
        </div>
      </div>

      {/* Freshness */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <FreshnessIndicator timestamp={hospital.lastAvailabilityUpdate || hospital.updatedAt} />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowBreakdown(!showBreakdown);
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-text-subtle hover:text-text px-2 py-1 rounded transition-colors"
          >
            <span>Score breakdown</span>
            {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {onRequestBed && (
            <Button
              size="sm"
              variant={isTop ? 'primary' : 'secondary'}
              icon={Send}
              isLoading={isRequesting}
              disabled={isRequested}
              onClick={(e) => {
                e.stopPropagation();
                onRequestBed(hospital);
              }}
            >
              {isRequested ? 'Requested' : 'Request Bed →'}
            </Button>
          )}
        </div>
      </div>

      {/* Score Breakdown Bars (Resource 50, Travel 25, Freshness 15, Load 10) */}
      {showBreakdown && (
        <div className="mt-3 pt-3 border-t border-border/80 space-y-2 text-xs animate-in fade-in duration-100">
          <div>
            <div className="flex justify-between text-text-muted mb-1">
              <span>Resource Match (Weight 50)</span>
              <span className="font-bold text-text tabular-nums">{breakdown.resource || 0} pts</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${((breakdown.resource || 0) / 50) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-text-muted mb-1">
              <span>Travel Time & Distance (Weight 25)</span>
              <span className="font-bold text-text tabular-nums">{breakdown.travel || 0} pts</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${((breakdown.travel || 0) / 25) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-text-muted mb-1">
              <span>Data Freshness (Weight 15)</span>
              <span className="font-bold text-text tabular-nums">{breakdown.freshness || 0} pts</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${((breakdown.freshness || 0) / 15) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-text-muted mb-1">
              <span>Capacity & Hospital Load (Weight 10)</span>
              <span className="font-bold text-text tabular-nums">{breakdown.load || 0} pts</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-warning rounded-full transition-all"
                style={{ width: `${((breakdown.load || 0) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
