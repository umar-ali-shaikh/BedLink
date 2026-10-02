import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { ConnectionBanner, LiveIndicator } from '../components/ConnectionBanner';
import { Logo } from '../components/Logo';
import { ROUTES } from '../constants/routes';
import { cn } from '../utils/cn';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('') || 'BL';

/**
 * Desktop operations shell from the Stitch "Dispatch Hub" design: white sidebar with an
 * OPERATIONS nav group and the user card at the bottom, a breadcrumb top bar with the live
 * indicator. Below 1024 px the sidebar becomes a drawer.
 */
export function AppShell({ nav, section, roleLabel, primaryAction }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const signOut = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="h-16 px-4 flex items-center border-b border-border">
        <Logo subtitle="Dispatch hub" />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
        <p className="px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-subtle">Operations</p>
        <ul className="space-y-0.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 h-10 px-2.5 rounded-md text-[14px] font-medium transition-colors',
                    isActive ? 'bg-primary-soft text-primary font-semibold' : 'text-text-muted hover:bg-surface-muted hover:text-text'
                  )
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        {primaryAction && <div className="mt-5 px-1">{primaryAction}</div>}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 p-2 rounded-md">
          <span className="w-9 h-9 rounded-md bg-primary text-text-inverse flex items-center justify-center text-small font-bold shrink-0" aria-hidden>
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-small font-semibold text-text truncate">{user?.name}</p>
            <p className="text-[11px] text-text-subtle truncate">{roleLabel}</p>
          </div>
          <button type="button" onClick={signOut} className="p-2 rounded-md text-text-subtle hover:text-danger hover:bg-danger-soft" aria-label="Sign out" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 bg-surface border-r border-border z-30">{sidebar}</aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[800]">
          <div className="absolute inset-0 bg-text/40" onClick={() => setOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface shadow-raised animate-fade-in">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-4 p-2 rounded-md text-text-subtle hover:bg-neutral-soft" aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-60 flex flex-col min-h-screen">
        <div className="sticky top-0 z-20">
          <ConnectionBanner />
          <header className="h-14 bg-surface/95 backdrop-blur border-b border-border px-4 lg:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button type="button" onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2 rounded-md text-text-muted hover:bg-neutral-soft" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </button>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text truncate">
                BedLink <span className="text-text-subtle font-semibold">/ {section}</span>
              </p>
            </div>
            <LiveIndicator />
          </header>
        </div>
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 py-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
