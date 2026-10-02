import React, { useState } from 'react';
import { IncomingBookingCard } from './IncomingBookingCard';
import { useBookingOffers } from './useBookingOffers';

/**
 * Shows the first pending offer and keeps it on screen while it is being answered, so the
 * live refetch can't unmount the card before the outcome shows.
 */
export function IncomingBookingSlot() {
  const query = useBookingOffers();
  const [held, setHeld] = useState(null);
  const offers = query.data?.offers ?? [];
  const current = held ?? offers[0];
  if (!current) return null;
  const offsetMs = query.data ? new Date(query.data.serverNow).getTime() - query.data.fetchedAt : 0;
  return <IncomingBookingCard key={current.id} offer={current} offsetMs={offsetMs} onAnswering={() => setHeld(current)} onSettled={() => setHeld(null)} />;
}
