import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, Inbox } from 'lucide-react';
import { useActiveReservations, useMyHospital, usePendingRequests } from '../../features/hospital/hooks';
import { IncomingRequestSlot } from '../../features/hospital/IncomingRequestSlot';
import { LoadControl } from '../../features/hospital/LoadControl';
import { BedCounters } from '../../features/beds/BedCounters';
import { ConfirmAllButton } from '../../features/beds/ConfirmAllButton';
import { ReservationActions, ReservationCard } from '../../features/reservations/ReservationCard';
import { reservationsApi } from '../../features/reservations/api';
import { Card } from '../../components/Card';
import { FreshnessIndicator } from '../../components/FreshnessIndicator';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';

export function useReservationMutations() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const done = (title) => () => {
    queryClient.invalidateQueries({ queryKey: qk.reservationsAll });
    queryClient.invalidateQueries({ queryKey: ['beds'] });
    queryClient.invalidateQueries({ queryKey: qk.hospitals });
    queryClient.invalidateQueries({ queryKey: qk.hospitalRequestsAll });
    showToast({ type: 'success', title });
  };
  const fail = (title) => (err) => showToast({ type: 'error', title, message: errorMessage(err) });
  const arrive = useMutation({ mutationFn: (id) => reservationsApi.arrive(id), onSuccess: done('Patient arrived — bed marked occupied'), onError: fail('Could not mark arrived') });
  const release = useMutation({ mutationFn: (id) => reservationsApi.release(id), onSuccess: done('Reservation released — bed is available'), onError: fail('Could not release') });
  return { arrive, release };
}

/** Mobile-first hospital dashboard (DESIGN.md §8.3). */
export function HospitalDashboardPage() {
  const hospital = useMyHospital();
  const pending = usePendingRequests();
  const reservations = useActiveReservations();
  const { arrive, release } = useReservationMutations();

  const pendingList = pending.data?.requests ?? [];
  const offsetMs = pending.data ? new Date(pending.data.serverNow).getTime() - pending.data.fetchedAt : 0;
  const h = hospital.data;

  return (
    <div className="space-y-5">
      {/* 1. Incoming request — only when pending, pushes everything else down */}
      <IncomingRequestSlot requests={pendingList} offsetMs={offsetMs} />
      {pendingList.length > 1 && (
        <p className="flex items-center gap-2 text-small font-medium text-danger">
          <BellRing className="w-4 h-4" aria-hidden /> {pendingList.length - 1} more request{pendingList.length > 2 ? 's' : ''} waiting
        </p>
      )}
      {!pending.isLoading && pendingList.length === 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-small text-text-muted">
          <Inbox className="w-5 h-5 text-text-subtle" aria-hidden />
          No pending requests. New ones appear here with an alert tone.
        </div>
      )}

      {hospital.isError ? (
        <ErrorState message={errorMessage(hospital.error)} onRetry={hospital.refetch} />
      ) : hospital.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-12" />
        </div>
      ) : (
        <>
          {/* 2. Bed counters */}
          <section aria-labelledby="available-heading">
            <div className="flex items-baseline justify-between mb-2.5">
              <h2 id="available-heading" className="text-[15px] font-semibold text-text">
                Available now
              </h2>
              <span className="text-small text-text-subtle tabular-nums">
                {h.bedSummary?.byStatus?.AVAILABLE ?? 0} of {h.bedSummary?.total ?? 0} beds free
              </span>
            </div>
            <BedCounters available={h.bedSummary?.available} />
          </section>

          {/* 3. Freshness + Confirm all */}
          <Card className="space-y-3">
            <FreshnessIndicator timestamp={h.bedSummary?.lastUpdatedAt ?? h.lastAvailabilityUpdate} />
            <p className="text-small text-text-muted">Dispatchers rank you lower when availability is old. Confirm when nothing changed.</p>
            <ConfirmAllButton hospitalId={h.id} className="w-full" />
          </Card>

          {/* 4. Load control */}
          <Card>
            <LoadControl hospital={h} />
          </Card>
        </>
      )}

      {/* 5. Active reservations */}
      <section aria-labelledby="reservations-heading">
        <h2 id="reservations-heading" className="text-[15px] font-semibold text-text mb-2.5">
          Active reservations
        </h2>
        {reservations.isLoading ? (
          <Skeleton className="h-28" />
        ) : reservations.isError ? (
          <ErrorState message={errorMessage(reservations.error)} onRetry={reservations.refetch} />
        ) : reservations.data?.length ? (
          <div className="space-y-3">
            {reservations.data.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                compact
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
            ))}
          </div>
        ) : (
          <p className="text-small text-text-subtle">No beds are held right now.</p>
        )}
      </section>
    </div>
  );
}
