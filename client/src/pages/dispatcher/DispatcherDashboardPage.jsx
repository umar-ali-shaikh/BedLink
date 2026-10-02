import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Activity, Clock, Building2, ChevronRight, Siren, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { StatusIndicator } from '../../components/StatusIndicator';
import { BedCounters } from '../../features/beds/BedCounters';
import { ROUTES } from '../../constants/routes';

const mockEmergencies = [
  {
    _id: 'em-101',
    demoPatientId: 'DEMO-P-0042',
    status: 'AWAITING_HOSPITAL',
    department: 'ICU Bed',
    urgency: 'CRITICAL',
    contactedHospital: 'Apex City Hospital',
    timeElapsed: '01:14',
    createdAt: new Date(Date.now() - 74000).toISOString(),
  },
  {
    _id: 'em-102',
    demoPatientId: 'DEMO-P-0039',
    status: 'RESERVED',
    department: 'Cardiac ICU',
    urgency: 'HIGH',
    contactedHospital: 'Metro Heart Institute',
    timeElapsed: 'Bed Locked',
    createdAt: new Date(Date.now() - 320000).toISOString(),
  },
  {
    _id: 'em-103',
    demoPatientId: 'DEMO-P-0035',
    status: 'COMPLETED',
    department: 'Burns Unit',
    urgency: 'MODERATE',
    contactedHospital: 'St. Jude Memorial Hospital',
    timeElapsed: 'Arrived',
    createdAt: new Date(Date.now() - 1400000).toISOString(),
  },
];

export function DispatcherDashboardPage() {
  const navigate = useNavigate();
  const [emergencies] = useState(mockEmergencies);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Dispatcher Operations Console</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time ambulance intake, bed reservation tracking, and regional availability
          </p>
        </div>

        <Button
          size="lg"
          icon={PlusCircle}
          onClick={() => navigate(ROUTES.DISPATCHER_NEW_EMERGENCY)}
          className="shadow-sm"
        >
          New Emergency Request →
        </Button>
      </div>

      {/* Regional Live Bed Availability Counters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">
            City-Wide Real-time Bed Availability
          </h2>
          <span className="text-xs text-success font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live sync active
          </span>
        </div>
        <BedCounters counts={{ icu: 14, ventilator: 19, oxygen: 38, cardiac: 7, burns: 3 }} />
      </div>

      {/* Active Emergencies Table / Cards */}
      <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-text">Active Emergency Requests</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-soft text-primary">
            {emergencies.length} Total Today
          </span>
        </div>

        <div className="divide-y divide-border">
          {emergencies.map((em) => (
            <div
              key={em._id}
              onClick={() => navigate(ROUTES.DISPATCHER_EMERGENCY_DETAIL.replace(':id', em._id))}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-soft flex items-center justify-center text-primary flex-shrink-0">
                  <Siren className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text font-mono">{em.demoPatientId}</span>
                    <StatusIndicator status={em.status} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {em.department} · Contacted: <strong className="text-text">{em.contactedHospital}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-left sm:text-right">
                  <span className="block text-[10px] uppercase font-semibold text-text-subtle">
                    Window Status
                  </span>
                  <span className="text-xs font-bold text-text tabular-nums">{em.timeElapsed}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-subtle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
