import React from 'react';
import { Inbox } from 'lucide-react';
import { useActiveReservations, useHospitalRequests } from '../../features/hospital/hooks';
import { IncomingRequestSlot } from '../../features/hospital/IncomingRequestSlot';
import { ReservationActions, ReservationCard } from '../../features/reservations/ReservationCard';
import { useReservationMutations } from './HospitalDashboardPage';
import { StatusIndicator } from '../../components/StatusIndicator';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { REJECT_REASON_LABELS } from '../../constants/emergency';
import { requirementsText } from '../../utils/labels';
import { formatClock } from '../../utils/formatRelative';
import { errorMessage } from '../../services/api';

/** Pending (top), active reservations, then recent outcomes (DESIGN.md §8.3). */
export function HospitalRequestsPage() {
  const requests = useHospitalRequests();
  const reservations = useActiveReservations();
  const { arrive, release } = useReservationMutations();
  const all = requests.data?.requests ?? [];
  const pending = all.filter((r) => r.status === 'PENDING');

  const recent = all.filter((r) => r.status !== 'PENDING').slice(0, 30);
  const offsetMs = requests.data ? new Date(requests.data.serverNow).getTime() - requests.data.fetchedAt : 0;

  if (requests.isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (requests.isError) return <ErrorState message={errorMessage(requests.error)} onRetry={requests.refetch} />;

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-h3 text-text">Pending</h2>
          <IncomingRequestSlot requests={pending} offsetMs={offsetMs} />
          {pending.length > 1 && <p className="text-small text-text-muted">{pending.length - 1} more waiting — they appear here one at a time.</p>}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-h3 text-text">Active reservations</h2>
        {reservations.data?.length ? (
          reservations.data.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              compact
              patientRef={all.find((o) => o.reservation?.id === r.id)?.emergency?.demoPatientId}
              actions={
                <ReservationActions
                  size="lg"
                  onArrive={() => arrive.mutate(r.id)}
                  onRelease={() => release.mutate(r.id)}
                  isArriving={arrive.isPending && arrive.variables === r.id}
                  isReleasing={release.isPending && release.variables === r.id}
                />
              }
            />
          ))
        ) : (
          <p className="text-small text-text-subtle">No beds are held right now.</p>
        )}
      </section>

      <section>
        <h2 className="text-h3 text-text mb-3">Recent requests</h2>
        {recent.length === 0 ? (
          <EmptyState icon={Inbox} title="No requests yet" description="Requests from ambulances show up here with their outcome." />
        ) : (
          <ul className="bg-surface border border-border rounded-lg divide-y divide-border">
            {recent.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-small font-semibold text-text tabular-nums">
                      {r.emergency?.demoPatientId ?? 'Emergency'} <span className="font-normal text-text-subtle">· {formatClock(r.offeredAt)}</span>
                    </p>
                    <p className="text-small text-text-muted truncate">{requirementsText(r.emergency?.requirements)}</p>
                    {r.status === 'REJECTED' && r.rejectReason && <p className="text-[12px] text-text-subtle">Reason: {REJECT_REASON_LABELS[r.rejectReason]}</p>}
                    {r.reservation?.bed && <p className="text-[12px] text-text-subtle">Bed {r.reservation.bed.label} · {r.reservation.status.toLowerCase()}</p>}
                  </div>
                  <StatusIndicator kind="offer" status={r.status} look="caps" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
