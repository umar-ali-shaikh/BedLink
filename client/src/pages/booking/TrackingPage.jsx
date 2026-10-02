import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban, Phone, RefreshCw } from 'lucide-react';
import { BookingTimeline } from '../../features/booking/BookingTimeline';
import { LiveEtaCard } from '../../features/booking/LiveEtaCard';
import { bookingApi } from '../../features/booking/api';
import { forgetBooking, rememberBooking } from '../../features/booking/activeBooking';
import { useBookingTracking } from '../../features/booking/useBookingTracking';
import { MapPanel } from '../../features/dispatcher/MapPanel';
import { Button } from '../../components/Button';
import { Card, CardHeader } from '../../components/Card';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { StatusIndicator } from '../../components/StatusIndicator';
import { useToast } from '../../components/Toast';
import { BOOKING_STATUS as S, CANCEL_REASON_FOR_CALLER, CONDITION_LABELS, LIVE_BOOKING_STATUSES } from '../../constants/booking';
import { ROUTES } from '../../constants/routes';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';

/** Public live tracking for one booking, reached only through its unguessable link. */
export function TrackingPage() {
  const { token } = useParams();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const query = useBookingTracking(token);
  const view = query.data;

  const show = (data) => queryClient.setQueryData(qk.tracking(token), { ...data, fetchedAt: Date.now() });
  const cancel = useMutation({
    mutationFn: () => bookingApi.cancel(token),
    onSuccess: (data) => {
      setConfirmCancel(false);
      forgetBooking();
      show(data);
      showToast({ type: 'info', title: 'Booking cancelled', message: 'The ambulance and any held hospital bed were released.' });
    },
    onError: (err) => {
      setConfirmCancel(false);
      showToast({ type: 'error', title: 'Could not cancel', message: errorMessage(err) });
      queryClient.invalidateQueries({ queryKey: qk.tracking(token) });
    },
  });
  const retry = useMutation({
    mutationFn: () => bookingApi.retry(token),
    onSuccess: (data) => {
      rememberBooking(token);
      show(data);
    },
    onError: (err) => showToast({ type: 'error', title: 'Could not try again', message: errorMessage(err) }),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (query.isError) {
    const missing = query.error?.status === 404;
    return (
      <div className="space-y-4">
        <ErrorState
          title={missing ? 'We could not find this booking' : 'Something went wrong'}
          message={missing ? 'The link may be mistyped, or the booking was removed. You can book again.' : errorMessage(query.error)}
          onRetry={missing ? undefined : query.refetch}
        />
        {missing && (
          <div className="text-center">
            <Link to={ROUTES.BOOK} className="font-semibold text-primary hover:underline">
              Book an ambulance
            </Link>
          </div>
        )}
      </div>
    );
  }

  const live = LIVE_BOOKING_STATUSES.includes(view.status);
  const hasCrew = !!view.ambulance;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusIndicator kind="booking" status={view.status} className="text-small" />
          <StatusIndicator kind="urgency" status={view.urgency} look="caps" />
        </div>
        <h1 className="text-h2 text-text mt-3" data-testid="booking-headline">
          {HEADLINE[view.status]}
        </h1>
        <p className="text-small text-text-muted mt-1">
          {CONDITION_LABELS[view.condition] ?? view.condition} · {view.pickup?.label}
        </p>
        {view.status === S.CANCELLED && view.cancellation?.by === 'AMBULANCE' && (
          <div className="mt-4 rounded-md border border-border bg-neutral-soft p-4" role="status" data-testid="cancellation-reason">
            <p className="text-small font-semibold text-text">Cancelled by the ambulance crew</p>
            <p className="text-small text-text mt-1">{CANCEL_REASON_FOR_CALLER[view.cancellation.reason] ?? CANCEL_REASON_FOR_CALLER.OTHER}</p>
            {view.cancellation.note && <p className="text-small text-text-muted mt-1">“{view.cancellation.note}”</p>}
            <p className="text-small text-text-muted mt-2">If you still need help, book again or call 112.</p>
          </div>
        )}
        {view.status === S.NO_AMBULANCE && (
          <div className="mt-4 rounded-md border border-danger/30 bg-danger-soft p-4" role="alert">
            <p className="text-small font-semibold text-danger">No ambulance is available near you right now.</p>
            <p className="text-small text-text mt-1">Try again in a moment. If this is life-threatening, also call 112.</p>
            <Button className="mt-3" icon={RefreshCw} onClick={() => retry.mutate()} isLoading={retry.isPending}>
              Try again
            </Button>
          </div>
        )}
      </Card>

      {[S.AMBULANCE_ASSIGNED, S.ON_THE_WAY].includes(view.status) && <LiveEtaCard ambulance={view.ambulance} />}

      {hasCrew && live && (
        <MapPanel
          className="h-[300px]"
          title="Live location"
          showLegend={false}
          patientLocation={view.pickup}
          pinLabel="Your pickup point"
          ambulance={view.ambulance.location ?? null}
          ambulanceLabel={`Ambulance ${view.ambulance.vehicleNumber}`}
        />
      )}

      <Card>
        <CardHeader title="Progress" subtitle="Updates by itself — no need to refresh" />
        <BookingTimeline view={view} />
      </Card>

      {live && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {view.ambulance?.phone ? (
            <a href={`tel:${view.ambulance.phone}`} className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border bg-surface text-small font-semibold text-text hover:border-primary hover:text-primary">
              <Phone className="w-4 h-4" aria-hidden /> Call the crew
            </a>
          ) : (
            <span />
          )}
          {view.cancellable ? (
            <Button variant="danger" icon={Ban} onClick={() => setConfirmCancel(true)}>
              Cancel booking
            </Button>
          ) : (
            <p className="text-small text-text-muted">The ambulance has reached you, so this can no longer be cancelled here.</p>
          )}
        </div>
      )}
      {!live && view.status !== S.NO_AMBULANCE && (
        <div className="text-center">
          <Link to={ROUTES.BOOK} className="text-small font-semibold text-primary hover:underline">
            Book another ambulance
          </Link>
        </div>
      )}
      <p className="text-[12px] text-text-subtle text-center">
        Keep this page link — it is your private tracking link. In a life-threatening emergency you can also call 112.
      </p>

      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancel.mutate()}
        isLoading={cancel.isPending}
        title="Cancel this booking?"
        message="The ambulance request is withdrawn and any hospital bed being held for you is released. This can't be undone."
        confirmLabel="Cancel booking"
      />
    </div>
  );
}

const HEADLINE = {
  [S.FINDING_AMBULANCE]: 'Finding an ambulance near you…',
  [S.NO_AMBULANCE]: 'No ambulance available',
  [S.AMBULANCE_ASSIGNED]: 'An ambulance has been assigned',
  [S.ON_THE_WAY]: 'The ambulance is on its way',
  [S.AT_PICKUP]: 'The ambulance has reached you',
  [S.COMPLETED]: 'The patient has arrived at the hospital',
  [S.CANCELLED]: 'This booking was cancelled',
};
