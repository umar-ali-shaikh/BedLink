import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Providers } from './providers';
import { config } from '../config';
import { FullPageLoader, ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../features/auth/useAuth';
import { ROLES } from '../constants/roles';
import { HOME_BY_ROLE, ROUTES } from '../constants/routes';
import { AuthLayout } from '../layouts/AuthLayout';
import { PublicLayout } from '../layouts/PublicLayout';
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

const RegisterChoicePage = lazy(() => import('../pages/register/RegisterChoicePage').then((m) => ({ default: m.RegisterChoicePage })));
const RegisterAmbulancePage = lazy(() => import('../pages/register/RegisterAmbulancePage').then((m) => ({ default: m.RegisterAmbulancePage })));
const RegisterHospitalPage = lazy(() => import('../pages/register/RegisterHospitalPage').then((m) => ({ default: m.RegisterHospitalPage })));
const AmbulanceProfilePage = lazy(() => import('../pages/dispatcher/AmbulanceProfilePage').then((m) => ({ default: m.AmbulanceProfilePage })));
const HospitalProfilePage = lazy(() => import('../pages/hospital/HospitalProfilePage').then((m) => ({ default: m.HospitalProfilePage })));

const BookingPage = lazy(() => import('../pages/booking/BookingPage').then((m) => ({ default: m.BookingPage })));
const TrackingPage = lazy(() => import('../pages/booking/TrackingPage').then((m) => ({ default: m.TrackingPage })));
const AdminVerificationsPage = lazy(() => import('../pages/admin/AdminVerificationsPage').then((m) => ({ default: m.AdminVerificationsPage })));

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  return <Navigate to={(user && HOME_BY_ROLE[user.role]) || ROUTES.LOGIN} replace />;
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
            <Route path={ROUTES.REGISTER} element={<RegisterChoicePage />} />
            <Route path={ROUTES.REGISTER_AMBULANCE} element={<RegisterAmbulancePage />} />
            <Route path={ROUTES.REGISTER_HOSPITAL} element={<RegisterHospitalPage />} />
          </Route>

          <Route element={<PublicLayout />}>
            <Route path={ROUTES.BOOK} element={<BookingPage />} />
            <Route path={ROUTES.TRACK} element={<TrackingPage />} />
          </Route>
          <Route element={guard([ROLES.DISPATCHER], <DispatcherLayout />)}>
            <Route path={ROUTES.DISPATCHER_DASHBOARD} element={<DispatcherDashboardPage />} />
            <Route path={ROUTES.DISPATCHER_NEW_EMERGENCY} element={<NewEmergencyPage />} />
            <Route path={ROUTES.DISPATCHER_EMERGENCY_DETAIL} element={<EmergencyDetailPage />} />
            <Route path={ROUTES.DISPATCHER_PROFILE} element={<AmbulanceProfilePage />} />
          </Route>

          <Route element={guard([ROLES.HOSPITAL], <HospitalLayout />)}>
            <Route path={ROUTES.HOSPITAL_DASHBOARD} element={<HospitalDashboardPage />} />
            <Route path={ROUTES.HOSPITAL_BEDS} element={<HospitalBedsPage />} />
            <Route path={ROUTES.HOSPITAL_REQUESTS} element={<HospitalRequestsPage />} />
            <Route path={ROUTES.HOSPITAL_PROFILE} element={<HospitalProfilePage />} />
          </Route>


          <Route element={guard([ROLES.ADMIN], <AdminLayout />)}>
            <Route path={ROUTES.ADMIN_VERIFICATIONS} element={<AdminVerificationsPage />} />
          </Route>

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
          </Suspense>
      </Providers>
    </BrowserRouter>
  );
}
