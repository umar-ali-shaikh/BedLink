import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Plus, Siren } from 'lucide-react';
import { AppShell } from './AppShell';
import { useAuth } from '../features/auth/useAuth';
import { ROUTES } from '../constants/routes';
import { AmbulanceVerificationBanner } from '../features/verification/AmbulanceVerificationBanner';
import { DutyToggle } from '../features/duty/DutyToggle';
import { useDutyLocationSharing } from '../features/duty/useDutyLocationSharing';
import { IncomingBookingSlot } from '../features/bookingOffers/IncomingBookingSlot';

const NAV = [
  { to: ROUTES.DISPATCHER_DASHBOARD, label: 'Overview', icon: LayoutGrid },
  { to: ROUTES.DISPATCHER_NEW_EMERGENCY, label: 'New emergency', icon: Siren },
];

/** Ambulance panel (API role DISPATCHER). */
export function DispatcherLayout() {
  const { user } = useAuth();
  const vehicle = user?.ambulance;
  // Mounted here (not on a page) so GPS sharing and booking offers keep working across pages.
  const gps = useDutyLocationSharing();
  return (
    <AppShell
      nav={NAV}
      hub="Ambulance"
      section="Ambulance"
      roleLabel={vehicle ? `${vehicle.vehicleNumber} · ${vehicle.ambulanceType}` : 'Ambulance crew'}
      banner={
        <>
          <AmbulanceVerificationBanner />
          <IncomingBookingSlot />
          <DutyToggle gps={gps} />
        </>
      }
      primaryAction={
        <Link
          to={ROUTES.DISPATCHER_NEW_EMERGENCY}
          className="flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-text-inverse text-small font-semibold hover:bg-primary-hover"
        >
          <Plus className="w-4 h-4" aria-hidden /> New emergency
        </Link>
      }
    />
  );
}
