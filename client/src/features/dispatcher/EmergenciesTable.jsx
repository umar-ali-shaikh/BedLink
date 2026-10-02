import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Siren } from 'lucide-react';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { StatusIndicator } from '../../components/StatusIndicator';
import { EmptyState } from '../../components/EmptyState';
import { useNow } from '../../hooks/useNow';
import { emergencyPath } from '../../constants/routes';
import { requirementsText } from '../../utils/labels';
import { formatDuration } from '../../utils/formatRelative';

const ACTIVE = ['SEARCHING', 'AWAITING_HOSPITAL', 'RESERVED', 'NO_MATCH'];

/** Emergencies list (ref, requirement, urgency, status, hospital, waiting). */
export function EmergenciesTable({ emergencies = [], hospitalNames = {}, role, compact = false, emptyAction }) {
  const navigate = useNavigate();
  const now = useNow(1000);

  const columns = [
    { key: 'ref', header: 'Ref', render: (e) => <span className="font-bold tabular-nums text-text whitespace-nowrap">{e.demoPatientId}</span> },
    { key: 'req', header: 'Requirement', render: (e) => <span className="text-text-muted">{requirementsText(e.requirements, ' + ')}</span> },
    ...(compact ? [] : [{ key: 'urgency', header: 'Urgency', render: (e) => <StatusIndicator kind="urgency" status={e.urgency} look="caps" /> }]),
    { key: 'hospital', header: 'Hospital', render: (e) => <span className="font-medium text-text">{hospitalNames[e.currentHospital] ?? '—'}</span> },
    ...(compact ? [] : [{ key: 'status', header: 'Status', render: (e) => <StatusIndicator kind="emergency" status={e.status} /> }]),
    ...(compact
      ? []
      : [
          {
            key: 'age',
            header: 'Time open',
            align: 'right',
            render: (e) => (
              <span className="tabular-nums text-text-muted">
                {ACTIVE.includes(e.status) ? formatDuration((now - new Date(e.createdAt).getTime()) / 1000) : '—'}
              </span>
            ),
          },
        ]),
  ];

  return (
    <ResponsiveTable
      columns={columns}
      rows={emergencies}
      onRowClick={(e) => navigate(emergencyPath(e.id, role))}
      empty={<EmptyState icon={Siren} className="m-4" title="No active emergencies" description="Create one to find a bed." {...emptyAction} />}
    />
  );
}
