import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, RefreshCw } from 'lucide-react';
import { useAuth } from '../../features/auth/useAuth';
import { useEmergency } from '../../features/emergency/useEmergency';
import { StatusBanner } from '../../features/emergency/StatusBanner';
import { EmergencyTimeline } from '../../features/emergency/EmergencyTimeline';
import { HospitalCard } from '../../features/dispatcher/HospitalCard';
import { ExcludedList } from '../../features/dispatcher/ExcludedList';
import { MapPanel } from '../../features/dispatcher/MapPanel';
import { emergencyApi } from '../../features/dispatcher/api';
import { reservationsApi } from '../../features/reservations/api';
import { ReservationActions, ReservationCard } from '../../features/reservations/ReservationCard';
import { Card, CardHeader } from '../../components/Card';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { CardSkeleton, Skeleton } from '../../components/Skeleton';
import { StatusIndicator } from '../../components/StatusIndicator';
import { useToast } from '../../components/Toast';
import { useSocket } from '../../socket/SocketContext';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import { CANCELLABLE_EMERGENCY_STATUSES, REJECT_REASON_LABELS, REQUESTABLE_EMERGENCY_STATUSES } from '../../constants/emergency';
import { ROLES } from '../../constants/roles';
import { HOME_BY_ROLE, ROUTES } from '../../constants/routes';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { requirementsText } from '../../utils/labels';
import { formatClock } from '../../utils/formatRelative';

/** Live emergency (DESIGN.md §8.2): status + countdown, reservation, candidates, timeline. */
export function EmergencyDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isConnected } = useSocket();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const isDispatcher = user?.role === ROLES.DISPATCHER;

  const names = (data) => {
    const map = {};
    data?.candidates?.forEach((c) => (map[c.hospitalId] = c.hospitalName));
    data?.exclusions?.forEach((x) => (map[x.hospitalId] = x.hospitalName));
    data?.timeline?.forEach((t) => t.hospitalId && t.metadata?.hospitalName && (map[t.hospitalId] = t.metadata.hospitalName));
    return map;
  };

  const query = useEmergency(id, {
    onEvent: (event, payload) => {
      const name = names(query.data)[payload.hospitalId] ?? 'The hospital';
      if (event === SOCKET_EVENTS.HOSPITAL_ACCEPTED) showToast({ type: 'success', title: `${name} accepted`, message: 'Bed reserved — details below.' });
      if (event === SOCKET_EVENTS.HOSPITAL_REJECTED)
        showToast({
          type: 'warning',
          title: `${name} rejected`,
          message: payload.reason === 'NO_BED_AT_ACCEPT' ? 'That bed was just taken. Finding the next hospital…' : `${REJECT_REASON_LABELS[payload.reason] ?? payload.reason}. Contacting the next hospital…`,
        });
      if (event === SOCKET_EVENTS.HOSPITAL_TIMEOUT) showToast({ type: 'warning', title: `${name} didn't respond in 2:00`, message: 'Automatic fallback — contacting the next hospital…' });
      if (event === SOCKET_EVENTS.RESERVATION_EXPIRED) showToast({ type: 'warning', title: 'Reservation expired', message: 'Request a hospital again to continue.' });
    },
  });
  const e = query.data;
  const hospitalNames = useMemo(() => names(e), [e]);
  const offsetMs = e ? new Date(e.serverNow).getTime() - e.fetchedAt : 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.emergency(id) });
    queryClient.invalidateQueries({ queryKey: qk.emergenciesAll });
  };

  const requestHospital = useMutation({
    mutationFn: (hospitalId) => emergencyApi.requestHospital(id, hospitalId),
    onSuccess: refresh,
    onError: (err) => showToast({ type: 'error', title: 'Request failed', message: errorMessage(err) }),
  });
  const cancel = useMutation({
    mutationFn: () => emergencyApi.cancel(id),
    onSuccess: () => {
      setConfirmCancel(false);
      refresh();
      showToast({ type: 'info', title: 'Emergency cancelled' });
    },
    onError: (err) => showToast({ type: 'error', title: 'Could not cancel', message: errorMessage(err) }),
  });
  const release = useMutation({
    mutationFn: () => reservationsApi.release(e.reservation.id),
    onSuccess: () => {
      setConfirmRelease(false);
      refresh();
      showToast({ type: 'info', title: 'Reservation released', message: 'You can request another hospital.' });
    },
    onError: (err) => showToast({ type: 'error', title: 'Could not release', message: errorMessage(err) }),
  });

  const backTo = user?.role === ROLES.ADMIN ? ROUTES.ADMIN_EMERGENCIES : HOME_BY_ROLE[user?.role];

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28" />
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-5">
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }
  if (query.isError) {
    return <ErrorState title={query.error?.status === 404 ? 'Emergency not found' : 'Something went wrong'} message={errorMessage(query.error)} onRetry={query.refetch} />;
  }

  const currentName = hospitalNames[e.currentHospital];
  const canRequest = isDispatcher && REQUESTABLE_EMERGENCY_STATUSES.includes(e.status);
  const canCancel = CANCELLABLE_EMERGENCY_STATUSES.includes(e.status);
  const activeReservation = e.reservation?.status === 'ACTIVE' ? e.reservation : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link to={backTo} className="inline-flex items-center gap-1 text-small font-medium text-text-muted hover:text-text mb-2">
            <ArrowLeft className="w-4 h-4" aria-hidden /> Back
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h1 text-text tabular-nums">{e.demoPatientId}</h1>
            <StatusIndicator kind="urgency" status={e.urgency} look="caps" />
            <StatusIndicator kind="emergency" status={e.status} />
          </div>
          <p className="text-small text-text-muted mt-1">
            {requirementsText(e.requirements)} · created {formatClock(e.createdAt)} · {e.patientLocation?.lat?.toFixed(4)}, {e.patientLocation?.lng?.toFixed(4)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRequest && (
            <Button icon={RefreshCw} onClick={() => requestHospital.mutate(undefined)} isLoading={requestHospital.isPending && requestHospital.variables === undefined} disabled={!isConnected}>
              {e.status === 'NO_MATCH' ? 'Retry matching' : 'Request best match'}
            </Button>
          )}
          {canCancel && (
            <Button variant="secondary" icon={Ban} onClick={() => setConfirmCancel(true)}>
              Cancel emergency
            </Button>
          )}
        </div>
      </div>

      <StatusBanner emergency={e} hospitalName={currentName} offsetMs={offsetMs} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-4 min-w-0">
          {activeReservation && (
            <ReservationCard
              reservation={activeReservation}
              hospitalName={hospitalNames[activeReservation.hospitalId] ?? currentName}
              offsetMs={offsetMs}
              actions={<ReservationActions onRelease={() => setConfirmRelease(true)} isReleasing={release.isPending} />}
            />
          )}

          <MapPanel className="h-[300px]" patientLocation={e.patientLocation} candidates={e.candidates} exclusions={e.exclusions} selectedId={e.currentHospital} />

          <div>
            <h2 className="text-h3 text-text mb-3">Candidates</h2>
            <div className="space-y-3">
              {e.candidates?.length ? (
                e.candidates.map((c, i) => (
                  <HospitalCard
                    key={c.hospitalId}
                    candidate={c}
                    matchedAt={e.updatedAt}
                    isTop={i === 0}
                    isCurrent={c.hospitalId === e.currentHospital && ['AWAITING_HOSPITAL', 'RESERVED', 'COMPLETED'].includes(e.status)}
                    onRequest={canRequest ? () => requestHospital.mutate(c.hospitalId) : undefined}
                    isRequesting={requestHospital.isPending && requestHospital.variables === c.hospitalId}
                    requestDisabled={requestHospital.isPending || !isConnected}
                  />
                ))
              ) : (
                <Card className="text-small text-text-muted">No ranked candidates right now.</Card>
              )}
              <ExcludedList exclusions={e.exclusions} />
            </div>
          </div>
        </div>

        <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] flex flex-col" padded={false}>
          <div className="px-5 pt-5">
            <CardHeader title="Timeline" subtitle="Every action, in order — the audit log" className="mb-3" />
          </div>
          <div className="px-5 pb-5 overflow-y-auto">
            <EmergencyTimeline entries={e.timeline} hospitalNames={hospitalNames} />
          </div>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancel.mutate()}
        isLoading={cancel.isPending}
        title="Cancel this emergency?"
        message="Any pending hospital request is withdrawn and a held bed is released. This can't be undone."
        confirmLabel="Cancel emergency"
      />
      <ConfirmDialog
        isOpen={confirmRelease}
        onClose={() => setConfirmRelease(false)}
        onConfirm={() => release.mutate()}
        isLoading={release.isPending}
        title="Release the held bed?"
        message="The bed becomes available to others and this emergency goes back to finding a hospital."
        confirmLabel="Release bed"
      />
      {e.status === 'CANCELLED' && isDispatcher && (
        <div className="text-center">
          <Button variant="secondary" onClick={() => navigate(ROUTES.DISPATCHER_NEW_EMERGENCY)}>
            Start a new emergency
          </Button>
        </div>
      )}
    </div>
  );
}
