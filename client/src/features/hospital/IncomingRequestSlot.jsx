import React, { useState } from 'react';
import { IncomingRequestCard } from './IncomingRequestCard';

/**
 * Shows the first pending request and keeps it on screen while it is being answered, so
 * the live `hospital:accepted` refetch can't unmount it before the 3 s outcome shows.
 */
export function IncomingRequestSlot({ requests = [], offsetMs }) {
  const [held, setHeld] = useState(null);
  const current = held ?? requests[0];
  if (!current) return null;
  return (
    <IncomingRequestCard
      key={current.id}
      request={current}
      offsetMs={offsetMs}
      onAnswering={() => setHeld(current)}
      onSettled={() => setHeld(null)}
    />
  );
}
