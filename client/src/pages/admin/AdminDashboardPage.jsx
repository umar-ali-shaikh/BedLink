import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Skeleton } from '../../components/Skeleton';
import { KpiRow } from '../../features/analytics/KpiRow';
import { ResponseChart } from '../../features/analytics/ResponseChart';
import { HospitalsTable } from '../../features/hospitals/HospitalsTable';
import { hospitalHealth } from '../../features/hospitals/health';
import { EmergenciesTable } from '../../features/dispatcher/EmergenciesTable';
import { useOpsRealtime } from '../../features/dispatcher/useOpsRealtime';
import { emergencyApi } from '../../features/dispatcher/api';
import { hospitalsApi } from '../../features/hospitals/api';
import { hospitalRequestsApi } from '../../features/hospital/api';
import { useNow } from '../../hooks/useNow';
import { qk } from '../../services/queryKeys';
import { config } from '../../config';
import { ACTIVE_EMERGENCY_STATUSES } from '../../constants/emergency';
import { ROLES } from '../../constants/roles';
import { ROUTES } from '../../constants/routes';
import { freshnessOf } from '../../utils/formatRelative';

export function exportHospitalsCsv(hospitals) {
  const header = ['Name', 'Address', 'Status', 'Load %', 'ICU free', 'Ventilators free', 'Oxygen free', 'Cardiac free', 'Burns free', 'Last update'];
  const rows = hospitals.map((h) => [
    h.name,
    h.address ?? '',
    hospitalHealth(h),
    h.currentLoad,
    ...['ICU', 'VENTILATOR', 'OXYGEN', 'CARDIAC', 'BURNS'].map((k) => h.bedSummary?.available?.[k] ?? 0),
    h.bedSummary?.lastUpdatedAt ?? '',
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `bedlink-hospitals-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

function SyncPill({ hospitals }) {
  const now = useNow(1000);
  const active = hospitals.filter((h) => h.status === 'ACTIVE');
  const fresh = active.filter((h) => freshnessOf(h.bedSummary?.lastUpdatedAt, now) !== 'STALE').length;
  const pct = active.length ? Math.round((fresh / active.length) * 100) : 100;
  const ok = pct >= 80;
  return (
    <span className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface text-small">
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-success' : 'bg-warning'}`} aria-hidden />
      <span className="text-text-muted">
        Data sync: <span className="font-semibold text-text tabular-nums">{pct}%</span> · {ok ? 'Operational' : 'Degraded'}
      </span>
      <span className="h-4 w-px bg-border" aria-hidden />
      <time className="font-semibold text-text tabular-nums">{new Date(now).toLocaleTimeString([], { hour12: false })}</time>
    </span>
  );
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  useOpsRealtime();
  const hospitals = useQuery({ queryKey: qk.hospitals, queryFn: () => hospitalsApi.list() });
  const emergencies = useQuery({ queryKey: qk.emergencies(ACTIVE_EMERGENCY_STATUSES.join(',')), queryFn: () => emergencyApi.list(ACTIVE_EMERGENCY_STATUSES) });
  const requests = useQuery({ queryKey: qk.hospitalRequests('all'), queryFn: async () => ({ ...(await hospitalRequestsApi.list()), fetchedAt: Date.now() }) });

  const hospitalNames = useMemo(() => Object.fromEntries((hospitals.data ?? []).map((h) => [h.id, h.name])), [hospitals.data]);
  const live = emergencies.data ?? [];

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`Today · ${config.regionName}`}
        actions={
          <>
            <SyncPill hospitals={hospitals.data ?? []} />
            <Button variant="secondary" icon={Download} onClick={() => exportHospitalsCsv(hospitals.data ?? [])} disabled={!hospitals.data?.length}>
              Export CSV
            </Button>
          </>
        }
      />
      <div className="space-y-5">
        <KpiRow />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <ResponseChart requests={requests.data?.requests} isLoading={requests.isLoading} />
          <Card padded={false} className="flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <h2 className="text-[15px] font-semibold text-text">Live emergencies</h2>
              <span className="text-[11px] font-bold uppercase tracking-wide text-danger bg-danger-soft border border-danger/20 rounded px-2 py-0.5">{live.length} active</span>
            </div>
            {emergencies.isLoading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-9" />
                ))}
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <EmergenciesTable emergencies={live} hospitalNames={hospitalNames} role={ROLES.ADMIN} compact />
              </div>
            )}
          </Card>
        </div>

        <HospitalsTable query={hospitals} onRowClick={(h) => navigate(`${ROUTES.ADMIN_HOSPITALS}?id=${h.id}`)} />
      </div>
    </>
  );
}
