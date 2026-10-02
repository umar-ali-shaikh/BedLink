import React, { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Navigation, Sparkles } from 'lucide-react';
import { ConfidenceBadge } from '../../components/ConfidenceBadge';
import { FreshnessIndicator } from '../../components/FreshnessIndicator';
import { Button } from '../../components/Button';
import { OwnershipBadge } from '../../components/OwnershipBadge';
import { formatDistance } from '../../utils/formatEta';
import { cn } from '../../utils/cn';

/** Score weights (server constants/matching.js) — the breakdown shows each contribution. */
const COMPONENTS = [
  { key: 'resource', label: 'Resource', weight: 50 },
  { key: 'travel', label: 'Travel', weight: 25 },
  { key: 'freshness', label: 'Freshness', weight: 15 },
  { key: 'load', label: 'Load', weight: 10 },
];

/**
 * Ranked hospital (DESIGN.md §5 "Hospital card"). `candidate` is the server's
 * CandidateSnapshot; reasons are server-generated text and only rendered here.
 * `matchedAt` = when matching ran, so freshness keeps ticking from the snapshot age.
 */
export function HospitalCard({ candidate, matchedAt, isTop, isSelected, isCurrent, onSelect, onRequest, requestLabel = 'Request bed', isRequesting, requestDisabled }) {
  const [open, setOpen] = useState(false);
  const c = candidate;
  const updatedAt = matchedAt && c.freshnessAgeSeconds != null ? new Date(new Date(matchedAt).getTime() - c.freshnessAgeSeconds * 1000) : null;

  return (
    <article
      onClick={onSelect}
      className={cn(
        'relative bg-surface border rounded-lg shadow-card transition-shadow animate-fade-in',
        isTop ? 'border-border border-l-4 border-l-primary' : 'border-border',
        isSelected && 'ring-2 ring-primary/60',
        isCurrent && 'border-primary bg-primary-soft/30',
        onSelect && 'cursor-pointer hover:shadow-raised'
      )}
      aria-label={`Rank ${c.rank}: ${c.hospitalName}`}
    >
      <div className="p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className={cn('w-8 h-8 rounded-md flex items-center justify-center text-small font-bold shrink-0', isTop ? 'bg-primary text-text-inverse' : 'bg-neutral-soft text-text-muted')}>
              #{c.rank}
            </span>
            <div className="min-w-0">
              <h3 className="text-h3 text-text break-words">{c.hospitalName}</h3>
              <OwnershipBadge ownership={c.ownership} className="mt-1" />
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {isTop && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden /> Best match
                  </span>
                )}
                {isCurrent && <span className="text-[11px] font-bold uppercase tracking-wide text-primary">Currently contacted</span>}
              </div>
            </div>
          </div>
          <ConfidenceBadge level={c.confidence} reasons={c.confidenceReasons} />
        </header>

        <dl className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <dt className="text-caption uppercase text-text-subtle">Match</dt>
            <dd className="text-number-lg tabular-nums text-primary">{c.score}</dd>
          </div>
          <div>
            <dt className="text-caption uppercase text-text-subtle">ETA</dt>
            <dd className="tabular-nums">
              <span className="text-number-lg text-text">{c.etaMinutes}</span>
              <span className="text-small text-text-muted ml-1">min est.</span>
            </dd>
          </div>
          <div>
            <dt className="text-caption uppercase text-text-subtle">Distance</dt>
            <dd className="flex items-center gap-1 text-number-md tabular-nums text-text mt-1.5">
              <Navigation className="w-4 h-4 text-text-subtle" aria-hidden />
              {formatDistance(c.distanceKm)}
            </dd>
          </div>
        </dl>

        {c.reasons?.length > 0 && (
          <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-4">
            {c.reasons.map((r) => (
              <li key={r} className="flex items-start gap-1.5 text-small text-text">
                <Check className="w-4 h-4 text-success shrink-0 mt-px" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
          <FreshnessIndicator timestamp={updatedAt} />
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
              aria-expanded={open}
              className="inline-flex items-center gap-1 h-8 px-2 rounded text-small font-medium text-text-muted hover:text-text hover:bg-neutral-soft"
            >
              Score breakdown <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} aria-hidden />
            </button>
            {onRequest && (
              <Button
                size="md"
                variant={isTop ? 'primary' : 'secondary'}
                isLoading={isRequesting}
                disabled={requestDisabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onRequest(c);
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  {requestLabel} <ArrowRight className="w-4 h-4" aria-hidden />
                </span>
              </Button>
            )}
          </div>
        </footer>

        {open && c.breakdown && (
          <div className="mt-3 space-y-2.5 animate-fade-in">
            {COMPONENTS.map(({ key, label, weight }) => {
              const points = Math.round((c.breakdown[key] ?? 0) * weight * 10) / 10;
              return (
                <div key={key}>
                  <div className="flex justify-between text-small mb-1">
                    <span className="text-text-muted">
                      {label} <span className="text-text-subtle">· weight {weight}</span>
                    </span>
                    <span className="tabular-nums font-semibold text-text">
                      {points} / {weight}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-soft overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(points / weight) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
