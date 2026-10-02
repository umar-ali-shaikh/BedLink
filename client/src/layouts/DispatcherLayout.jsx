import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Plus, Siren } from 'lucide-react';
import { AppShell } from './AppShell';
import { useAuth } from '../features/auth/useAuth';
import { ROUTES } from '../constants/routes';

const NAV = [
  { to: ROUTES.DISPATCHER_DASHBOARD, label: 'Overview', icon: LayoutGrid },
  { to: ROUTES.DISPATCHER_NEW_EMERGENCY, label: 'New emergency', icon: Siren },
];

/** Ambulance panel (API role DISPATCHER). */
export function DispatcherLayout() {
  const { user } = useAuth();
  const vehicle = user?.ambulance;
  return (
    <AppShell
      nav={NAV}
      hub="Ambulance"
      section="Ambulance"
      roleLabel={vehicle ? `${vehicle.vehicleNumber} · ${vehicle.ambulanceType}` : 'Ambulance crew'}
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
