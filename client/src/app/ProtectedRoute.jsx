import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { BedDouble } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { HOME_BY_ROLE, ROUTES } from '../constants/routes';

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-text-muted" role="status">
      <div className="w-11 h-11 rounded-lg bg-primary text-text-inverse flex items-center justify-center animate-pulse-gentle">
        <BedDouble className="w-6 h-6" />
      </div>
      <span className="text-small">Loading BedLink…</span>
    </div>
  );
}

/** Client-side guard only; the API is the real guard (ARCHITECTURE.md §5). */
export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={HOME_BY_ROLE[user.role] ?? ROUTES.LOGIN} replace />;
  }
  return children;
}
