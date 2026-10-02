import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './api';
import { qk } from '../../services/queryKeys';
import { KpiStrip } from '../../components/KpiStrip';

/** PRD F11 KPIs (GET /api/analytics/overview) in the Stitch KPI strip. */
export function KpiRow() {
  const { data, isLoading } = useQuery({ queryKey: qk.analytics, queryFn: analyticsApi.overview, refetchInterval: 30_000 });
  const items = [
    { label: 'Requests', value: data?.totalEmergencies },
    { label: 'Accepted', value: data?.offers.accepted, tone: 'success' },
    { label: 'Rejected', value: data?.offers.rejected, tone: 'danger' },
    { label: 'Timed out', value: data?.offers.timedOut, tone: 'warning' },
    { label: 'Avg response', value: data?.avgResponseSeconds != null ? Math.round(data.avgResponseSeconds) : null, unit: 's' },
    { label: 'Avg matching', value: data?.avgMatchingMs != null ? Math.round(data.avgMatchingMs) : null, unit: 'ms' },
    { label: 'ICU free', value: data?.availableIcuBeds },
    { label: 'Ventilators free', value: data?.availableVentilatorBeds },
  ];
  return <KpiStrip items={items} isLoading={isLoading} />;
}
