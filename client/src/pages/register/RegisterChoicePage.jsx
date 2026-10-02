import React from 'react';
import { Link } from 'react-router-dom';
import { Ambulance, Building2, ChevronRight, ShieldCheck } from 'lucide-react';
import { RegisterShell } from '../../features/auth/RegisterShell';
import { ROUTES } from '../../constants/routes';

const OPTIONS = [
  {
    to: ROUTES.REGISTER_AMBULANCE,
    icon: Ambulance,
    title: 'Ambulance',
    text: 'Crew or driver. Find the right hospital bed and request it in seconds.',
    note: 'Ready to use right away',
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
  return (
    <RegisterShell title="Create an account" subtitle="Who is registering?">
      <div className="space-y-3">
        {OPTIONS.map(({ to, icon: Icon, title, text, note }) => (
          <Link key={to} to={to} className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary-soft/40 transition-colors">
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
