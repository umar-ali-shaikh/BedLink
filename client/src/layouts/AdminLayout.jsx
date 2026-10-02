import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { BedDouble, BarChart3, Building2, Users, LogOut } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { ROUTES } from '../constants/routes';
import { cn } from '../utils/cn';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <ConnectionBanner />

      <header className="sticky top-0 z-40 bg-surface border-b border-border shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <NavLink to={ROUTES.ADMIN_DASHBOARD} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-warning-soft flex items-center justify-center text-warning group-hover:scale-105 transition-transform">
                <BedDouble className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-text tracking-tight flex items-center gap-1.5">
                BedLink
                <span className="text-[11px] px-2 py-0.2 rounded font-semibold bg-warning-soft text-warning uppercase">
                  Admin
                </span>
              </span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1 ml-4">
              <NavLink
                to={ROUTES.ADMIN_DASHBOARD}
                end
                className={({ isActive }) =>
                  cn(
                    'px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors',
                    isActive ? 'bg-surface-muted text-primary border border-border' : 'text-text-muted hover:text-text'
                  )
                }
              >
                <BarChart3 className="w-4 h-4" />
                <span>Dashboard & Analytics</span>
              </NavLink>

              <NavLink
                to={ROUTES.ADMIN_HOSPITALS}
                className={({ isActive }) =>
                  cn(
                    'px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors',
                    isActive ? 'bg-surface-muted text-primary border border-border' : 'text-text-muted hover:text-text'
                  )
                }
              >
                <Building2 className="w-4 h-4" />
                <span>Hospitals & Beds</span>
              </NavLink>

              <NavLink
                to={ROUTES.ADMIN_USERS}
                className={({ isActive }) =>
                  cn(
                    'px-3.5 py-2 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors',
                    isActive ? 'bg-surface-muted text-primary border border-border' : 'text-text-muted hover:text-text'
                  )
                }
              >
                <Users className="w-4 h-4" />
                <span>Users & Roles</span>
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block text-xs">
              <p className="font-semibold text-text">{user?.name || user?.email}</p>
              <p className="text-[10px] text-text-subtle font-mono">System Administrator</p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="p-2 rounded-lg border border-border text-text-subtle hover:text-danger hover:border-danger/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
