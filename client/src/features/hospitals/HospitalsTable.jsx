import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { LoadBar } from '../../components/LoadBar';
import { FreshnessIndicator } from '../../components/FreshnessIndicator';
import { StatusIndicator } from '../../components/StatusIndicator';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { useNow } from '../../hooks/useNow';
import { errorMessage } from '../../services/api';
import { hospitalHealth } from './health';
import { config } from '../../config';
import { cn } from '../../utils/cn';

const count = (n) => <span className={cn('tabular-nums font-semibold', n > 0 ? 'text-success' : 'text-danger')}>{n ?? 0}</span>;

/** Stitch "Hospitals" table: name/area, load bar, ICU free, ventilators, freshness, status. */
export function HospitalsTable({ query, title = 'Hospitals', onRowClick, actions }) {
  const [filter, setFilter] = useState('');
  const now = useNow(5000);
  const hospitals = query.data ?? [];
  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? hospitals.filter((h) => `${h.name} ${h.address ?? ''}`.toLowerCase().includes(f)) : hospitals;
  }, [hospitals, filter]);

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (h) => (
        <div className="min-w-0">
          <p className="font-semibold text-text truncate">{h.name}</p>
          <p className="text-[12px] text-text-subtle truncate">{(h.address ?? '').replace(' (fictional)', '')}</p>
        </div>
      ),
    },
    { key: 'load', header: 'Load %', render: (h) => <LoadBar value={h.currentLoad} /> },
    { key: 'icu', header: 'ICU free', align: 'center', render: (h) => count(h.bedSummary?.available?.ICU) },
    { key: 'vent', header: 'Ventilators', align: 'center', render: (h) => count(h.bedSummary?.available?.VENTILATOR) },
    { key: 'fresh', header: 'Data freshness', render: (h) => <FreshnessIndicator timestamp={h.bedSummary?.lastUpdatedAt ?? h.lastAvailabilityUpdate} compact /> },
    { key: 'status', header: 'Status', align: 'right', render: (h) => <StatusIndicator kind="hospital" status={hospitalHealth(h, now)} look="caps" /> },
  ];

  return (
    <Card padded={false}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div>
          <h2 className="text-[15px] font-semibold text-text">{title}</h2>
          <p className="text-small text-text-subtle">{hospitals.length} facilities monitored · {config.regionName}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative block sm:w-72">
            <span className="sr-only">Filter hospitals</span>
            <Search className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter hospitals by name or area…" className="input pl-9 bg-primary-soft/40" />
          </label>
          {actions}
        </div>
      </div>
      {query.isLoading ? (
        <div className="p-4 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState className="m-4" message={errorMessage(query.error)} onRetry={query.refetch} />
      ) : (
        <ResponsiveTable
          columns={columns}
          rows={rows}
          onRowClick={onRowClick}
          empty={<EmptyState className="m-4" title={filter ? 'No hospitals match that filter' : 'No hospitals yet'} description={filter ? 'Try another name or area.' : 'Create one to start matching.'} />}
        />
      )}
    </Card>
  );
}
