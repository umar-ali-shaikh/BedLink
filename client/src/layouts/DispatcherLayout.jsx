import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { BedDouble, PlusCircle, Activity, LogOut, Radio, Shield } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { ROUTES } from '../constants/routes';
import { cn } from '../utils/cn';

export function DispatcherLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <ConnectionBanner />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <NavLink to={ROUTES.DISPATCHER_DASHBOARD} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <BedDouble className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-text tracking-tight flex items-center gap-1.5">
                  BedLink
                  <span className="text-[11px] px-2 py-0.2 rounded font-semibold bg-primary-soft text-primary uppercase">
                    Dispatcher
                  </span>
                </span>
              </div>
            </NavLink>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1 ml-4">
              <NavLink
                to={ROUTES.DISPATCHER_DASHBOARD}
                end
                className={({ isActive }) =>
                  cn(
                    'px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors',
                    isActive
                      ? 'bg-surface-muted text-primary border border-border'
                      : 'text-text-muted hover:text-text hover:bg-surface-muted/60'
                  )
                }
              >
                <Activity className="w-4 h-4" />
                <span>Active Emergencies</span>
              </NavLink>

              <NavLink
                to={ROUTES.DISPATCHER_NEW_EMERGENCY}
                className={({ isActive }) =>
                  cn(
                    'px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors',
                    isActive
                      ? 'bg-primary text-text-inverse shadow-sm'
                      : 'text-primary bg-primary-soft/60 hover:bg-primary-soft'
                  )
                }
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Emergency</span>
              </NavLink>
            </nav>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-text-muted">Live Dispatch System</span>
            </div>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-text">{user?.name || user?.email}</p>
                <p className="text-[10px] text-text-subtle capitalize">{user?.role?.toLowerCase()}</p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                className="p-2 rounded-lg border border-border hover:bg-danger-soft hover:text-danger hover:border-danger/30 text-text-subtle transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
