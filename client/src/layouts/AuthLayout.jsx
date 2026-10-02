import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { HOME_BY_ROLE } from '../constants/routes';
import { FullPageLoader } from '../app/ProtectedRoute';

export function AuthLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-bg">
      <Outlet />
    </main>
  );
}
