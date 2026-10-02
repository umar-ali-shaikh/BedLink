import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { Logo } from '../components/Logo';
import { ROUTES } from '../constants/routes';

/** Shell for the public caller pages (/book, /track/:token): no login, no panel navigation. */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <ConnectionBanner />
      <header className="bg-surface border-b border-border">
        <div className="max-w-[720px] mx-auto h-14 px-4 flex items-center justify-between">
          <Link to={ROUTES.LOGIN} aria-label="BedLink home">
            <Logo />
          </Link>
          <Link to={ROUTES.LOGIN} className="text-small font-semibold text-primary hover:underline">
            Crew / hospital sign in
          </Link>
        </div>
      </header>
      <main className="flex-1 w-full max-w-[720px] mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
