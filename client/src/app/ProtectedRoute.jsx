import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/useAuth';
import { ROUTES } from '../constants/routes';
import { Skeleton } from '../components/Skeleton';

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 bg-surface rounded-xl border border-border shadow-card space-y-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  // Not logged in -> send to login with return path
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Check role authorization
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard per ARCHITECTURE.md §5
    if (user.role === 'DISPATCHER') {
      return <Navigate to={ROUTES.DISPATCHER_DASHBOARD} replace />;
    } else if (user.role === 'HOSPITAL') {
      return <Navigate to={ROUTES.HOSPITAL_DASHBOARD} replace />;
    } else if (user.role === 'ADMIN') {
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    }
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return children;
}
