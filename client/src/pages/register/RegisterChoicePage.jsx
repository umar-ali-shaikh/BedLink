import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ambulance, Building2, ChevronRight, ShieldCheck } from 'lucide-react';
import { RegisterShell } from '../../features/auth/RegisterShell';
import { ROUTES } from '../../constants/routes';

const OPTIONS = [
  {
    to: ROUTES.REGISTER_AMBULANCE,
    icon: Ambulance,
    title: 'Ambulance',
    text: 'Crew or driver. Find the right hospital bed and request it in seconds.',
    note: 'Verified by our team before requesting beds',
  },
  {
    to: ROUTES.REGISTER_HOSPITAL,
    icon: Building2,
    title: 'Hospital',
    text: 'Share live bed availability and accept incoming patients.',
    note: 'Verified before ambulances can see you',
  },
];

export function RegisterChoicePage() {
  const google = useLocation().state?.google;
  return (
    <RegisterShell title="Create an account" subtitle="Who is registering?">
      {google?.email && (
        <p className="mb-4 rounded-md border border-primary/20 bg-primary-soft/60 px-3 py-2.5 text-small text-text" role="status">
          No BedLink account uses <strong>{google.email}</strong> yet. Choose who you are to finish registering with Google.
        </p>
      )}
      <div className="space-y-3">
        {OPTIONS.map(({ to, icon: Icon, title, text, note }) => (
          <Link key={to} to={to} state={google ? { google } : undefined} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary-soft/40 transition-colors">
            <span className="w-12 h-12 rounded-md bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6" aria-hidden />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-h3 text-text">{title}</span>
              <span className="block text-small text-text-muted">{text}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-success">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden /> {note}
              </span>
            </span>
            <ChevronRight className="w-5 h-5 text-text-subtle" aria-hidden />
          </Link>
        ))}
      </div>
    </RegisterShell>
  );
}
