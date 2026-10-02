import React from 'react';
import { MapPin, Phone, User } from 'lucide-react';
import { Card } from '../../components/Card';
import { StatusIndicator } from '../../components/StatusIndicator';
import { CONDITION_LABELS } from '../../constants/booking';

/** Who booked this ambulance (public booking): shown to the crew that accepted it. */
export function CallerCard({ booking }) {
  if (!booking) return null;
  const { caller } = booking;
  return (
    <Card className="border-primary/30" data-testid="caller-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption uppercase tracking-wider font-bold text-text-subtle">Public booking</p>
        <StatusIndicator kind="urgency" status={booking.urgency} look="caps" />
      </div>
      <p className="mt-2 text-h3 text-text">{CONDITION_LABELS[booking.condition] ?? booking.condition}</p>
      {caller ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-small">
          <span className="inline-flex items-center gap-1.5 text-text">
            <User className="w-4 h-4 text-text-subtle" aria-hidden /> {caller.name}
          </span>
          <a href={`tel:${caller.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
            <Phone className="w-4 h-4" aria-hidden /> Call {caller.phone}
          </a>
        </div>
      ) : (
        <p className="mt-3 text-small text-text-subtle">Caller details were removed after the retention period.</p>
      )}
      {booking.pickup?.label && (
        <p className="mt-2 text-small text-text-muted inline-flex items-start gap-1.5">
          <MapPin className="w-4 h-4 text-text-subtle shrink-0 mt-0.5" aria-hidden /> {booking.pickup.label}
        </p>
      )}
      {booking.notes && <p className="mt-1 text-small text-text-muted">“{booking.notes}”</p>}
    </Card>
  );
}
