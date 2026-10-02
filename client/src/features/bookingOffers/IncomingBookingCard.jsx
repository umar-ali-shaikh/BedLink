import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ambulance, Check, CircleX, Clock, MapPin, Phone, User } from 'lucide-react';
import { bookingOffersApi } from '../booking/api';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CountdownTimer } from '../../components/CountdownTimer';
import { useToast } from '../../components/Toast';
import { CONDITION_LABELS } from '../../constants/booking';
import { emergencyPath } from '../../constants/routes';
import { errorMessage } from '../../services/api';
import { qk } from '../../services/queryKeys';
import { useSocket } from '../../socket/SocketContext';
import { cn } from '../../utils/cn';
import { formatDistance } from '../../utils/formatEta';
import { formatClock } from '../../utils/formatRelative';

const windowSeconds = (offer) => (offer?.offeredAt && offer?.expiresAt ? (new Date(offer.expiresAt) - new Date(offer.offeredAt)) / 1000 : undefined);
const URGENCY_BAR = { CRITICAL: 'bg-danger', HIGH: 'bg-warning', MODERATE: 'bg-neutral-state' };

/**
 * A public booking offered to this ambulance (same handshake as the hospital request card):
 * countdown → condition and pickup → Accept (green, on top) / Reject (needs a confirm).
 * Accept raises the emergency and opens its page. The caller's name and phone appear there.
 */
export function IncomingBookingCard({ offer, offsetMs = 0, onAnswering, onSettled }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isConnected } = useSocket();
  const [rejecting, setRejecting] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const settle = (result, delay = 3000) => {
    setOutcome(result);
    timer.current = setTimeout(() => {
      onSettled?.();
      queryClient.invalidateQueries({ queryKey: qk.bookingOffers });
    }, delay);
  };
  const onError = (err) => {
    const late = ['OFFER_EXPIRED', 'OFFER_ALREADY_RESOLVED', 'INVALID_STATE_TRANSITION'].includes(err.code);
    showToast({ type: 'error', title: late ? 'Too late' : 'Could not respond', message: late ? 'This booking is no longer available.' : errorMessage(err) });
    queryClient.invalidateQueries({ queryKey: qk.bookingOffers });
    onSettled?.();
  };
  const accept = useMutation({
    mutationFn: () => bookingOffersApi.accept(offer.id),
    onMutate: () => onAnswering?.(),
    onSuccess: ({ emergency }) => {
      queryClient.invalidateQueries({ queryKey: qk.emergenciesAll });
      queryClient.invalidateQueries({ queryKey: qk.bookingOffers });
      showToast({ type: 'success', title: 'Booking accepted', message: 'Contacting the best-matched hospital — details below.' });
      onSettled?.();
      navigate(emergencyPath(emergency.id));
    },
    onError,
  });
  const reject = useMutation({
    mutationFn: () => bookingOffersApi.reject(offer.id),
    onMutate: () => onAnswering?.(),
    onSuccess: () => {
      setRejecting(false);
      settle({ text: 'Rejected. The booking is offered to the next nearest ambulance.' });
    },
    onError: (err) => {
      setRejecting(false);
      onError(err);
    },
  });

  if (outcome) {
    return (
      <section className="mb-5 rounded-lg border bg-neutral-soft border-border p-6 text-center text-text-muted animate-fade-in" role="status">
        <CircleX className="w-10 h-10 mx-auto" aria-hidden />
        <p className="mt-3 text-h3 text-text">{outcome.text}</p>
      </section>
    );
  }

  const booking = offer.booking ?? {};
  const urgency = booking.urgency ?? 'HIGH';
  const busy = accept.isPending || reject.isPending;
  return (
    <section
      className="relative overflow-hidden mb-5 bg-surface border-2 border-primary rounded-lg shadow-raised animate-fade-in"
      aria-live="assertive"
      aria-label="Incoming ambulance booking"
      data-testid="incoming-booking"
    >
      <div className={cn('h-1.5', URGENCY_BAR[urgency])} aria-hidden />
      <div className="p-5 text-center">
        <p className="text-caption uppercase tracking-wider font-bold text-text-muted">
          Ambulance booking · <span className={urgency === 'CRITICAL' ? 'text-danger' : urgency === 'HIGH' ? 'text-warning' : 'text-text-muted'}>{urgency}</span>
        </p>
        <CountdownTimer expiresAt={offer.expiresAt} offsetMs={offsetMs} totalSeconds={windowSeconds(offer)} showBar className="mt-2 w-full items-center" />
        <p className="mt-4 text-h3 text-text">{CONDITION_LABELS[booking.condition] ?? 'Emergency'}</p>
        <p className="mt-2 text-body text-text">
          <MapPin className="w-5 h-5 text-primary inline-block align-[-4px] mr-1.5" aria-hidden />
          {booking.pickup?.label}
        </p>
        {booking.notes && <p className="mt-1 text-small text-text-muted">“{booking.notes}”</p>}
        <p className="mt-2 text-body text-text">
          <Ambulance className="w-5 h-5 text-primary inline-block align-[-4px] mr-1.5" aria-hidden />
          Pickup est. <strong className="tabular-nums">{offer.etaMinutes ?? '—'} min</strong> from you ({formatDistance(offer.distanceKm)})
        </p>
        {booking.caller && (
          <div className="mt-3 flex flex-col items-center gap-2" data-testid="offer-caller">
            <p className="text-body text-text">
              <User className="w-5 h-5 text-primary inline-block align-[-4px] mr-1.5" aria-hidden />
              {booking.caller.name}
            </p>
            <a
              href={`tel:${booking.caller.phone}`}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-md border border-primary/40 bg-primary-soft text-small font-semibold text-primary"
              aria-label={`Call the caller on ${booking.caller.phone}`}
            >
              <Phone className="w-4 h-4" aria-hidden /> Call {booking.caller.phone}
            </a>
          </div>
        )}
        <p className="mt-2 text-small text-text-subtle">
          <Clock className="w-4 h-4 inline-block align-[-3px] mr-1" aria-hidden />
          Booked at {formatClock(booking.createdAt)}
        </p>
      </div>
      <div className="px-5 pb-5">
        <Button variant="success" size="xl" className="w-full" icon={Check} onClick={() => accept.mutate()} isLoading={accept.isPending} disabled={busy || !isConnected}>
          Accept
        </Button>
        <div className="h-6" aria-hidden />
        <Button variant="danger" size="lg" className="w-full" onClick={() => setRejecting(true)} disabled={busy || !isConnected}>
          Reject…
        </Button>
        {!isConnected && <p className="mt-3 text-small text-warning text-center">Reconnecting — answers are paused until you're back online.</p>}
      </div>
      <ConfirmDialog
        isOpen={rejecting}
        onClose={() => setRejecting(false)}
        onConfirm={() => reject.mutate()}
        isLoading={reject.isPending}
        title="Reject this booking?"
        message="It is offered to the next nearest ambulance."
        confirmLabel="Reject booking"
      />
    </section>
  );
}
