import React from 'react';
import { Navigation } from 'lucide-react';
import { Card } from '../../components/Card';
import { useNow } from '../../hooks/useNow';
import { formatDistance } from '../../utils/formatEta';
import { formatRelativeTime } from '../../utils/formatRelative';

/**
 * Live ETA to the pickup. The server recomputes it from every GPS position (same estimate as
 * matching), so it is labelled "est." (ARCHITECTURE.md §12).
 */
export function LiveEtaCard({ ambulance }) {
  const now = useNow(1000);
  if (!ambulance?.location || ambulance.etaMinutes == null) {
    return (
      <Card className="flex items-center gap-3 text-small text-text-muted" role="status">
        <Navigation className="w-5 h-5 text-text-subtle shrink-0" aria-hidden />
        Waiting for the ambulance to share its location…
      </Card>
    );
  }
  return (
    <Card className="flex items-end justify-between gap-4" role="status" aria-live="polite">
      <div>
        <p className="text-caption uppercase tracking-wider font-bold text-text-subtle">Arriving in about</p>
        <p className="text-display tabular-nums text-primary font-bold" data-testid="eta-minutes">
          {ambulance.etaMinutes} <span className="text-h3 text-text-muted font-semibold">min</span>
        </p>
      </div>
      <div className="text-right">
        <p className="text-h3 tabular-nums text-text" data-testid="eta-distance">
          {formatDistance(ambulance.distanceKm)}
        </p>
        <p className="text-[12px] text-text-subtle">est. · updated {formatRelativeTime(ambulance.locationAt, now)}</p>
      </div>
    </Card>
  );
}
