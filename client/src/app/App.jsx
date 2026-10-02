import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Providers } from './providers';
import { config } from '../config';
import { FullPageLoader, ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../features/auth/useAuth';
import { ROLES } from '../constants/roles';
import { HOME_BY_ROLE, ROUTES } from '../constants/routes';
import { AuthLayout } from '../layouts/AuthLayout';
import { DispatcherLayout } from '../layouts/DispatcherLayout';
import { HospitalLayout } from '../layouts/HospitalLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoginPage } from '../pages/LoginPage';

const DispatcherDashboardPage = lazy(() => import('../pages/dispatcher/DispatcherDashboardPage').then((m) => ({ default: m.DispatcherDashboardPage })));
const NewEmergencyPage = lazy(() => import('../pages/dispatcher/NewEmergencyPage').then((m) => ({ default: m.NewEmergencyPage })));
const EmergencyDetailPage = lazy(() => import('../pages/dispatcher/EmergencyDetailPage').then((m) => ({ default: m.EmergencyDetailPage })));
const HospitalDashboardPage = lazy(() => import('../pages/hospital/HospitalDashboardPage').then((m) => ({ default: m.HospitalDashboardPage })));
const HospitalBedsPage = lazy(() => import('../pages/hospital/HospitalBedsPage').then((m) => ({ default: m.HospitalBedsPage })));
const HospitalRequestsPage = lazy(() => import('../pages/hospital/HospitalRequestsPage').then((m) => ({ default: m.HospitalRequestsPage })));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminHospitalsPage = lazy(() => import('../pages/admin/AdminHospitalsPage').then((m) => ({ default: m.AdminHospitalsPage })));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminEmergenciesPage = lazy(() => import('../pages/admin/AdminEmergenciesPage').then((m) => ({ default: m.AdminEmergenciesPage })));

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : ROUTES.LOGIN} replace />;
}

const guard = (roles, element) => <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>;

export default function App() {
  return (
    <BrowserRouter basename={config.basePath}>
      <Providers>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
          <Route element={<AuthLayout />}>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          </Route>

          <Route element={guard([ROLES.DISPATCHER], <DispatcherLayout />)}>
            <Route path={ROUTES.DISPATCHER_DASHBOARD} element={<DispatcherDashboardPage />} />
            <Route path={ROUTES.DISPATCHER_NEW_EMERGENCY} element={<NewEmergencyPage />} />
            <Route path={ROUTES.DISPATCHER_EMERGENCY_DETAIL} element={<EmergencyDetailPage />} />
          </Route>

          <Route element={guard([ROLES.HOSPITAL], <HospitalLayout />)}>
            <Route path={ROUTES.HOSPITAL_DASHBOARD} element={<HospitalDashboardPage />} />
            <Route path={ROUTES.HOSPITAL_BEDS} element={<HospitalBedsPage />} />
            <Route path={ROUTES.HOSPITAL_REQUESTS} element={<HospitalRequestsPage />} />
          </Route>

          <Route element={guard([ROLES.ADMIN], <AdminLayout />)}>
            <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
            <Route path={ROUTES.ADMIN_HOSPITALS} element={<AdminHospitalsPage />} />
            <Route path={ROUTES.ADMIN_USERS} element={<AdminUsersPage />} />
            <Route path={ROUTES.ADMIN_EMERGENCIES} element={<AdminEmergenciesPage />} />
            <Route path={ROUTES.ADMIN_EMERGENCY_DETAIL} element={<EmergencyDetailPage />} />
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
          </Suspense>
      </Providers>
    </BrowserRouter>
  );
}
