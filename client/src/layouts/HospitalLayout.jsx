import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BedDouble, Inbox, Volume2, VolumeX, LogOut } from 'lucide-react';
import { useAuth } from '../features/auth/useAuth';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { ROUTES } from '../constants/routes';
import { cn } from '../utils/cn';

export function HospitalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSignOut = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col pb-16 sm:pb-0">
      <ConnectionBanner />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border shadow-xs">
        <div className="max-w-2xl mx-auto px-4 h-15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-success-soft flex items-center justify-center text-success">
              <BedDouble className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-text flex items-center gap-1.5">
                BedLink
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-success-soft text-success uppercase">
                  Hospital Staff
                </span>
              </h1>
              <p className="text-[11px] text-text-subtle truncate max-w-[160px] sm:max-w-xs">
                {user?.hospital?.name || 'City General Hospital'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound toggle per DESIGN.md §11 */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Alert audio enabled' : 'Alert audio muted'}
              className={cn(
                'p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors',
                soundEnabled
                  ? 'bg-primary-soft text-primary border-primary/20'
                  : 'bg-surface border-border text-text-subtle hover:text-text'
              )}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

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

      {/* Main Content (Mobile centered max-width 560px per DESIGN.md §9) */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6">
        <Outlet context={{ soundEnabled }} />
      </main>

      {/* Bottom Tab Bar (Mobile first per DESIGN.md §8.3) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-around h-16 max-w-2xl mx-auto shadow-raised">
        <NavLink
          to={ROUTES.HOSPITAL_DASHBOARD}
          end
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold transition-colors gap-1',
              isActive ? 'text-primary' : 'text-text-muted hover:text-text'
            )
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to={ROUTES.HOSPITAL_BEDS}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold transition-colors gap-1',
              isActive ? 'text-primary' : 'text-text-muted hover:text-text'
            )
          }
        >
          <BedDouble className="w-5 h-5" />
          <span>Beds</span>
        </NavLink>

        <NavLink
          to={ROUTES.HOSPITAL_REQUESTS}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center flex-1 h-full text-xs font-semibold transition-colors gap-1',
              isActive ? 'text-primary' : 'text-text-muted hover:text-text'
            )
          }
        >
          <Inbox className="w-5 h-5" />
          <span>Requests</span>
        </NavLink>
      </nav>
    </div>
  );
}
