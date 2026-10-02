import React from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  TimerOff,
  Clock,
  BedDouble,
  Wind,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export function KpiRow({ stats = {}, className }) {
  const kpis = [
    { label: 'Total Emergencies', value: stats.totalRequests ?? 142, icon: Activity, color: 'text-primary' },
    { label: 'Handshake Accepted', value: stats.acceptedCount ?? 118, icon: CheckCircle, color: 'text-success' },
    { label: 'Declined / Re-routed', value: stats.rejectedCount ?? 16, icon: XCircle, color: 'text-danger' },
    { label: 'Handshake Timed Out', value: stats.timeoutCount ?? 8, icon: TimerOff, color: 'text-warning' },
    { label: 'Avg Handshake Response', value: stats.avgResponseSec ? `${stats.avgResponseSec}s` : '38s', icon: Clock, color: 'text-primary' },
    { label: 'City Available ICU', value: stats.availableIcu ?? 24, icon: BedDouble, color: 'text-success' },
    { label: 'City Available Ventilators', value: stats.availableVents ?? 31, icon: Wind, color: 'text-primary' },
  ];

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3', className)}>
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-xl bg-surface border border-border shadow-card hover:border-border-strong transition-all"
          >
            <div className="flex items-center justify-between text-text-subtle mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                {kpi.label}
              </span>
              <Icon className={cn('w-4 h-4 flex-shrink-0', kpi.color)} />
            </div>
            <div className="text-2xl font-bold text-text tabular-nums">{kpi.value}</div>
          </div>
        );
      })}
    </div>
  );
}
