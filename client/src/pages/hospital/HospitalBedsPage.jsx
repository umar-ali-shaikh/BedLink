import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BedDouble } from 'lucide-react';
import { useActiveReservations, useMyBeds, useMyHospital, useMyHospitalId } from '../../features/hospital/hooks';
import { BedTile } from '../../features/beds/BedTile';
import { ConfirmAllButton } from '../../features/beds/ConfirmAllButton';
import { bedsApi } from '../../features/beds/api';
import { FreshnessIndicator } from '../../components/FreshnessIndicator';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { useSocket } from '../../socket/SocketContext';
import { BED_TYPE_LABELS, BED_TYPE_VALUES } from '../../constants/bed';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { cn } from '../../utils/cn';

/** Stitch beds screen: type tabs with counts, summary line, bed cards, one-tap status. */
export function HospitalBedsPage() {
  const hospitalId = useMyHospitalId();
  const beds = useMyBeds();
  const hospital = useMyHospital();
  const reservations = useActiveReservations();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isConnected } = useSocket();
  const [type, setType] = useState('ICU');
  const [pending, setPending] = useState({});

  const list = beds.data ?? [];
  const counts = useMemo(() => Object.fromEntries(BED_TYPE_VALUES.map((t) => [t, list.filter((b) => b.type === t).length])), [list]);
  const shown = type === 'ALL' ? list : list.filter((b) => b.type === type);
  const freeShown = shown.filter((b) => b.status === 'AVAILABLE').length;
  const reservationByBed = useMemo(() => Object.fromEntries((reservations.data ?? []).map((r) => [r.bedId, r])), [reservations.data]);

  const mutation = useMutation({
    mutationFn: ({ bed, status }) => bedsApi.updateStatus(bed.id, status),
    // Optimistic: flip the tile now, roll back on error (DESIGN.md §8.3).
    onMutate: async ({ bed, status }) => {
      setPending((p) => ({ ...p, [bed.id]: status }));
      await queryClient.cancelQueries({ queryKey: qk.beds(hospitalId) });
      const previous = queryClient.getQueryData(qk.beds(hospitalId));
      queryClient.setQueryData(qk.beds(hospitalId), (old) => old?.map((b) => (b.id === bed.id ? { ...b, status } : b)));
      return { previous };
    },
    onError: (err, _v, ctx) => {
      queryClient.setQueryData(qk.beds(hospitalId), ctx?.previous);
      showToast({ type: 'error', title: 'Status not saved', message: errorMessage(err) });
    },
    onSettled: (_d, _e, { bed }) => {
      setPending(({ [bed.id]: _, ...rest }) => rest);
      queryClient.invalidateQueries({ queryKey: qk.beds(hospitalId) });
      queryClient.invalidateQueries({ queryKey: qk.hospital(hospitalId) });
    },
  });

  const change = (bed, status) => {
    const previousStatus = bed.status;
    mutation.mutate(
      { bed, status },
      {
        onSuccess: () =>
          showToast({
            type: 'success',
            title: `${bed.label} → ${status.charAt(0) + status.slice(1).toLowerCase()}`,
            action: { label: 'Undo', onClick: () => mutation.mutate({ bed: { ...bed, status }, status: previousStatus }) },
          }),
      }
    );
  };

  const tabs = [{ value: 'ALL', label: 'All', count: list.length }, ...BED_TYPE_VALUES.map((t) => ({ value: t, label: BED_TYPE_LABELS[t], count: counts[t] }))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-text">Beds</h2>
        <FreshnessIndicator timestamp={hospital.data?.bedSummary?.lastUpdatedAt} compact />
      </div>

      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1" role="tablist" aria-label="Bed type">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={type === t.value}
            onClick={() => setType(t.value)}
            className={cn(
              'h-10 px-3.5 rounded-md border text-small font-semibold whitespace-nowrap inline-flex items-center gap-1.5',
              type === t.value ? 'bg-primary border-primary text-text-inverse' : 'bg-surface border-border text-text-muted'
            )}
          >
            {t.label}
            <span className={cn('tabular-nums text-[11px] px-1.5 rounded', type === t.value ? 'bg-text-inverse/20' : 'bg-neutral-soft')}>{t.count}</span>
          </button>
        ))}
      </div>

      {!beds.isLoading && !beds.isError && (
        <p className="flex items-center gap-1.5 text-small text-text-muted">
          <span className={cn('w-2 h-2 rounded-full', freeShown > 0 ? 'bg-success' : 'bg-danger')} aria-hidden />
          <strong className="text-text">{type === 'ALL' ? 'All beds' : BED_TYPE_LABELS[type]}</strong> — {freeShown} available of {shown.length}
        </p>
      )}

      {beds.isLoading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)
      ) : beds.isError ? (
        <ErrorState message={errorMessage(beds.error)} onRetry={beds.refetch} />
      ) : shown.length === 0 ? (
        <EmptyState icon={BedDouble} title={`No ${type === 'ALL' ? '' : BED_TYPE_LABELS[type] + ' '}beds`} description="Ask an admin to add beds to your inventory." />
      ) : (
        <div className="space-y-3">
          {shown.map((bed) => (
            <BedTile key={bed.id} bed={bed} reservation={reservationByBed[bed.id]} pendingStatus={pending[bed.id]} onChange={change} disabled={!isConnected || !!pending[bed.id]} />
          ))}
        </div>
      )}

      {list.length > 0 && <ConfirmAllButton hospitalId={hospitalId} className="w-full" />}
    </div>
  );
}
