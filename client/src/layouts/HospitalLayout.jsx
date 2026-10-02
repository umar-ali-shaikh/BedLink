import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BedDouble, Building2, ChevronRight, Inbox, LayoutGrid, LogOut, Siren, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { ConnectionBanner, LiveIndicator } from '../components/ConnectionBanner';
import { CountdownTimer } from '../components/CountdownTimer';
import { ROUTES } from '../constants/routes';
import { isSoundEnabled, setSoundEnabled } from '../features/hospital/alertSound';
import { useHospitalRealtime, usePendingRequests } from '../features/hospital/hooks';
import { VerificationBanner } from '../features/hospital/VerificationBanner';
import { cn } from '../utils/cn';

const TABS = [
  { to: ROUTES.HOSPITAL_DASHBOARD, label: 'Dashboard', icon: LayoutGrid },
  { to: ROUTES.HOSPITAL_BEDS, label: 'Beds', icon: BedDouble },
  { to: ROUTES.HOSPITAL_REQUESTS, label: 'Requests', icon: Inbox },
  { to: ROUTES.HOSPITAL_PROFILE, label: 'Hospital', icon: Building2 },
];

const SECTION = {
  [ROUTES.HOSPITAL_DASHBOARD]: 'Dashboard',
  [ROUTES.HOSPITAL_BEDS]: 'Beds',
  [ROUTES.HOSPITAL_REQUESTS]: 'Requests',
  [ROUTES.HOSPITAL_PROFILE]: 'Hospital profile',
};

/** Mobile-first hospital shell (375 px baseline, max 560 px) from the Stitch beds screen. */
export function HospitalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sound, setSound] = useState(isSoundEnabled);
  const [menuOpen, setMenuOpen] = useState(false);
  useHospitalRealtime();
  const pending = usePendingRequests();
  const pendingList = pending.data?.requests ?? [];
  const next = pendingList[0];
  const onDashboard = location.pathname === ROUTES.HOSPITAL_DASHBOARD;

  const toggleSound = () => {
    setSoundEnabled(!sound);
    setSound(!sound);
  };

  const signOut = async () => {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[560px] min-h-screen flex flex-col bg-bg md:border-x md:border-border">
        <div className="sticky top-0 z-30">
          <ConnectionBanner />
          <header className="bg-surface border-b border-border px-4 h-16 flex items-center gap-3">
            <span className="hidden min-[420px]:flex w-10 h-10 rounded-md bg-primary-soft text-primary items-center justify-center shrink-0" aria-hidden>
              <BedDouble className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-[16px] font-bold text-text truncate">{user?.hospital?.name ?? 'Hospital'}</h1>
                <LiveIndicator className="shrink-0 bg-success-soft px-1.5 py-0.5 rounded-full" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle">{SECTION[location.pathname] ?? 'Hospital'}</p>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className="w-10 h-10 rounded-md flex items-center justify-center text-text-muted hover:bg-neutral-soft"
              aria-pressed={sound}
              aria-label={sound ? 'Sound on — tap to mute alerts' : 'Sound off — tap to enable alerts'}
              title={sound ? 'Sound on' : 'Sound off'}
            >
              {sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="w-10 h-10 rounded-md bg-primary text-text-inverse flex items-center justify-center text-small font-bold"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                {(user?.name ?? 'H').slice(0, 1).toUpperCase()}
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-md shadow-raised p-1.5 animate-fade-in">
                  <p className="px-2.5 py-2 text-small">
                    <span className="block font-semibold text-text truncate">{user?.name}</span>
                    <span className="block text-text-subtle truncate">{user?.email}</span>
                  </p>
                  <button role="menuitem" type="button" onClick={signOut} className="w-full flex items-center gap-2 px-2.5 h-10 rounded text-small font-medium text-danger hover:bg-danger-soft">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </header>
        </div>

        <main className="flex-1 px-4 pt-4 pb-28">
          <VerificationBanner />
          <Outlet />
        </main>

        <div className="fixed bottom-0 inset-x-0 z-30">
          <div className="mx-auto max-w-[560px]">
            {next && !onDashboard && (
              <Link
                to={ROUTES.HOSPITAL_DASHBOARD}
                className="mx-3 mb-2 flex items-center gap-3 px-4 h-14 rounded-lg bg-danger text-text-inverse shadow-raised"
                aria-live="assertive"
              >
                <Siren className="w-5 h-5 shrink-0" aria-hidden />
                <span className="flex-1 font-semibold">Incoming request — respond now</span>
                <CountdownTimer
                  expiresAt={next.expiresAt}
                  offsetMs={new Date(pending.data.serverNow).getTime() - pending.data.fetchedAt}
                  size="sm"
                  tone="text-text-inverse"
                />
                <ChevronRight className="w-5 h-5" aria-hidden />
              </Link>
            )}
            <nav className="bg-surface border-t border-border grid grid-cols-4 pb-[env(safe-area-inset-bottom)]" aria-label="Hospital">
              {TABS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn('relative h-16 flex flex-col items-center justify-center gap-1 text-[12px] font-semibold', isActive ? 'text-primary' : 'text-text-subtle hover:text-text')
                  }
                >
                  <span className="relative">
                    <Icon className="w-5 h-5" aria-hidden />
                    {to === ROUTES.HOSPITAL_REQUESTS && pendingList.length > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-text-inverse text-[10px] font-bold flex items-center justify-center">
                        {pendingList.length}
                      </span>
                    )}
                  </span>
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
