import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Plus, Siren } from 'lucide-react';
import { AppShell } from './AppShell';
import { ROUTES } from '../constants/routes';

const NAV = [
  { to: ROUTES.DISPATCHER_DASHBOARD, label: 'Overview', icon: LayoutGrid },
  { to: ROUTES.DISPATCHER_NEW_EMERGENCY, label: 'New emergency', icon: Siren },
];

export function DispatcherLayout() {
  return (
    <AppShell
      nav={NAV}
      section="Dispatcher"
      roleLabel="Dispatcher"
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
