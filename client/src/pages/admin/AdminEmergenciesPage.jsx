import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { Segmented } from '../../components/Segmented';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmergenciesTable } from '../../features/dispatcher/EmergenciesTable';
import { useOpsRealtime } from '../../features/dispatcher/useOpsRealtime';
import { emergencyApi } from '../../features/dispatcher/api';
import { hospitalsApi } from '../../features/hospitals/api';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { ACTIVE_EMERGENCY_STATUSES } from '../../constants/emergency';
import { ROLES } from '../../constants/roles';

const FILTERS = {
  active: ACTIVE_EMERGENCY_STATUSES,
  closed: ['COMPLETED', 'CANCELLED'],
  all: [],
};

export function AdminEmergenciesPage() {
  useOpsRealtime();
  const [filter, setFilter] = useState('active');
  const hospitals = useQuery({ queryKey: qk.hospitals, queryFn: () => hospitalsApi.list() });
  const statuses = FILTERS[filter];
  const emergencies = useQuery({ queryKey: qk.emergencies(statuses.join(',') || 'all'), queryFn: () => emergencyApi.list(statuses) });
  const hospitalNames = useMemo(() => Object.fromEntries((hospitals.data ?? []).map((h) => [h.id, h.name])), [hospitals.data]);

  return (
    <>
      <PageHeader title="Emergencies" subtitle="All dispatchers · newest first" />
      <Card padded={false}>
        <div className="px-4 pt-4 pb-3">
          <Segmented
            label="Filter emergencies"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'closed', label: 'Closed' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
        {emergencies.isLoading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : emergencies.isError ? (
          <ErrorState className="m-4" message={errorMessage(emergencies.error)} onRetry={emergencies.refetch} />
        ) : (
          <EmergenciesTable emergencies={emergencies.data} hospitalNames={hospitalNames} role={ROLES.ADMIN} />
        )}
      </Card>
    </>
  );
}
