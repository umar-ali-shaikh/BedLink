import React from 'react';
import { Ambulance, Phone, UserRound } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Who is coming (hospital screens): vehicle number and type, organisation, driver, and the
 * crew phone as a tap-to-call link. Shown instead of internal ids or case references.
 */
export function CrewContact({ crew, className, align = 'center' }) {
  if (!crew) return <p className={cn('text-small text-text-subtle', className)}>Ambulance details unavailable</p>;
  const centered = align === 'center';
  return (
    <div className={cn('space-y-1', centered && 'text-center', className)} data-testid="crew-contact">
      <p className="text-body text-text">
        <Ambulance className="w-5 h-5 text-primary inline-block align-[-4px] mr-1.5" aria-hidden />
        <strong className="tabular-nums">{crew.vehicleNumber}</strong> · {crew.ambulanceType}
        {crew.organization ? ` · ${crew.organization}` : ''}
      </p>
      <p className="text-small text-text-muted">
        <UserRound className="w-4 h-4 inline-block align-[-3px] mr-1" aria-hidden />
        Driver {crew.driverName || 'not given'}
      </p>
      {crew.phone && (
        <a
          href={`tel:${crew.phone}`}
          className={cn(
            'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-md border border-primary/40 bg-primary-soft text-small font-semibold text-primary hover:bg-primary-soft/70',
            !centered && 'w-fit'
          )}
          aria-label={`Call the ambulance crew on ${crew.phone}`}
        >
          <Phone className="w-4 h-4" aria-hidden /> Call crew {crew.phone}
        </a>
      )}
    </div>
  );
}
