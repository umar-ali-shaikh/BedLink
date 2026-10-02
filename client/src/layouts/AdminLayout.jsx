import React from 'react';
import { Building2, LayoutGrid, Siren, Users } from 'lucide-react';
import { AppShell } from './AppShell';
import { ROUTES } from '../constants/routes';

const NAV = [
  { to: ROUTES.ADMIN_DASHBOARD, label: 'Overview', icon: LayoutGrid },
  { to: ROUTES.ADMIN_HOSPITALS, label: 'Hospitals', icon: Building2 },
  { to: ROUTES.ADMIN_USERS, label: 'Users', icon: Users },
  { to: ROUTES.ADMIN_EMERGENCIES, label: 'Emergencies', icon: Siren },
];

export function AdminLayout() {
  return <AppShell nav={NAV} section="Dispatch operations" roleLabel="Regional admin" />;
}
