import React from 'react';
import { Outlet } from 'react-router-dom';
import { ConnectionBanner } from '../components/ConnectionBanner';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-bg flex flex-col justify-between">
      <ConnectionBanner />
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Outlet />
      </div>
      <footer className="py-4 text-center text-xs text-text-subtle border-t border-border">
        BedLink — Real-time Emergency Hospital Bed Coordination Platform
      </footer>
    </div>
  );
}
