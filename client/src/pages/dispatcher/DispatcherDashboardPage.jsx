import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Card, CardHeader } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { KpiRow } from '../../features/analytics/KpiRow';
import { HospitalsTable } from '../../features/hospitals/HospitalsTable';
import { BedCounters } from '../../features/beds/BedCounters';
import { EmergenciesTable } from '../../features/dispatcher/EmergenciesTable';
import { useOpsRealtime } from '../../features/dispatcher/useOpsRealtime';
import { emergencyApi } from '../../features/dispatcher/api';
import { hospitalsApi } from '../../features/hospitals/api';
import { qk } from '../../services/queryKeys';
import { config } from '../../config';
import { errorMessage } from '../../services/api';
import { ACTIVE_EMERGENCY_STATUSES } from '../../constants/emergency';
import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import { SUMMARY_RESOURCES } from '../../constants/bed';

export function DispatcherDashboardPage() {
  const navigate = useNavigate();
  useOpsRealtime();
  const hospitals = useQuery({ queryKey: qk.hospitals, queryFn: () => hospitalsApi.list() });
  const emergencies = useQuery({ queryKey: qk.emergencies('mine'), queryFn: () => emergencyApi.list() });

  const hospitalNames = useMemo(() => Object.fromEntries((hospitals.data ?? []).map((h) => [h.id, h.name])), [hospitals.data]);
  const all = emergencies.data ?? [];
  const active = all.filter((e) => ACTIVE_EMERGENCY_STATUSES.includes(e.status));
  const recent = all.filter((e) => !ACTIVE_EMERGENCY_STATUSES.includes(e.status)).slice(0, 6);

  const citySummary = useMemo(() => {
    const totals = Object.fromEntries(SUMMARY_RESOURCES.map((r) => [r.key, 0]));
    (hospitals.data ?? [])
      .filter((h) => h.status === 'ACTIVE')
      .forEach((h) => SUMMARY_RESOURCES.forEach((r) => (totals[r.key] += h.bedSummary?.available?.[r.key] ?? 0)));
    return totals;
  }, [hospitals.data]);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={config.regionName ? `Today · ${config.regionName}` : 'Today'}
        actions={
          <Link to={ROUTES.DISPATCHER_NEW_EMERGENCY} className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-text-inverse text-small font-semibold hover:bg-primary-hover">
            <Plus className="w-4 h-4" aria-hidden /> New emergency
          </Link>
        }
      />
      <div className="space-y-5">
        <KpiRow />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card padded={false}>
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-text">My active emergencies</h2>
              {active.length > 0 && (
                <span className="text-[11px] font-bold uppercase tracking-wide text-danger bg-danger-soft border border-danger/20 rounded px-2 py-0.5">{active.length} active</span>
              )}
            </div>
            {emergencies.isLoading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : emergencies.isError ? (
              <ErrorState className="m-4" message={errorMessage(emergencies.error)} onRetry={emergencies.refetch} />
            ) : (
              <EmergenciesTable
                emergencies={active}
                hospitalNames={hospitalNames}
                role={ROLES.DISPATCHER}
                emptyAction={{ actionLabel: 'New emergency', onAction: () => navigate(ROUTES.DISPATCHER_NEW_EMERGENCY) }}
              />
            )}
          </Card>

          <Card>
            <CardHeader title="Live city bed availability" subtitle="Available now across active hospitals" />
            {hospitals.isLoading ? <Skeleton className="h-40" /> : <BedCounters available={citySummary} columns="grid-cols-2 sm:grid-cols-3" />}
          </Card>
        </div>

        <HospitalsTable query={hospitals} />

        {recent.length > 0 && (
          <Card padded={false}>
            <h2 className="px-4 pt-4 pb-2 text-[15px] font-semibold text-text">Recently closed</h2>
            <EmergenciesTable emergencies={recent} hospitalNames={hospitalNames} role={ROLES.DISPATCHER} />
          </Card>
        )}
      </div>
    </>
  );
}
