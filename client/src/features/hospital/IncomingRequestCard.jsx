import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ambulance, Check, CircleCheck, CircleX } from 'lucide-react';
import { hospitalRequestsApi } from './api';
import { reservationsApi } from '../reservations/api';
import { RejectReasonModal } from './RejectReasonModal';
import { Button } from '../../components/Button';
import { CrewContact } from './CrewContact';
import { CountdownTimer } from '../../components/CountdownTimer';
import { useToast } from '../../components/Toast';
import { useSocket } from '../../socket/SocketContext';
import { qk } from '../../services/queryKeys';
import { errorMessage } from '../../services/api';
import { CONDITION_LABELS } from '../../constants/booking';
import { requirementsText } from '../../utils/labels';
import { formatClock } from '../../utils/formatRelative';
import { formatDistance } from '../../utils/formatEta';
import { cn } from '../../utils/cn';

/** The offer window comes from the server (OFFER_TIMEOUT_SECONDS): expiresAt − offeredAt. */
const windowSeconds = (offer) =>
  offer?.offeredAt && offer?.expiresAt ? (new Date(offer.expiresAt) - new Date(offer.offeredAt)) / 1000 : undefined;

const URGENCY_BAR = { CRITICAL: 'bg-danger', HIGH: 'bg-warning', MODERATE: 'bg-neutral-state' };

/**
 * The handshake card (DESIGN.md §8.4): status line → giant countdown → requirements → ETA
 * → Accept (green, xl, on top) and Reject (outline, ≥ 24 px below, needs a reason).
 * After answering it shows the outcome for 3 s, then collapses.
 */
export function IncomingRequestCard({ request, offsetMs = 0, onAnswering, onSettled }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isConnected } = useSocket();
  const [rejecting, setRejecting] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = (result) => {
    setOutcome(result);
    timer.current = setTimeout(() => {
      onSettled?.();
      queryClient.invalidateQueries({ queryKey: qk.hospitalRequestsAll });
    }, 3000);
    queryClient.invalidateQueries({ queryKey: qk.reservationsAll });
    queryClient.invalidateQueries({ queryKey: ['beds'] });
    queryClient.invalidateQueries({ queryKey: qk.hospitals });
  };

  const onError = (err) => {
    const expired = err.code === 'OFFER_EXPIRED' || err.code === 'OFFER_ALREADY_RESOLVED';
    showToast({
      type: 'error',
      title: err.code === 'BED_NOT_AVAILABLE' ? 'No matching bed is free anymore' : expired ? 'Too late' : 'Could not respond',
      message: err.code === 'BED_NOT_AVAILABLE' ? 'The next hospital is being contacted.' : errorMessage(err),
    });
    queryClient.invalidateQueries({ queryKey: qk.hospitalRequestsAll });
    onSettled?.();
  };

  const accept = useMutation({
    mutationFn: async () => {
      const data = await hospitalRequestsApi.accept(request.id);
      // The accept response carries bedId only; the reservations list has the label.
      const active = await reservationsApi.list(['ACTIVE']).catch(() => []);
      return active.find((r) => r.id === data?.reservation?.id) ?? data?.reservation;
    },
    onMutate: () => onAnswering?.(),
    onSuccess: (reservation) =>
      finish({ ok: true, text: `Accepted. Bed ${reservation?.bed?.label ?? ''} is held until ${formatClock(reservation?.expiresAt)}.` }),
    onError,
  });
  const reject = useMutation({
    mutationFn: (reason) => hospitalRequestsApi.reject(request.id, reason),
    onMutate: () => onAnswering?.(),
    onSuccess: () => {
      setRejecting(false);
      finish({ ok: false, text: 'Rejected. The ambulance is being routed to the next hospital.' });
    },
    onError: (err) => {
      setRejecting(false);
      onError(err);
    },
  });

  if (outcome) {
    const Icon = outcome.ok ? CircleCheck : CircleX;
    return (
      <section className={cn('rounded-lg border p-6 text-center animate-fade-in', outcome.ok ? 'bg-success-soft border-success/30 text-success' : 'bg-neutral-soft border-border text-text-muted')} role="status">
        <Icon className="w-10 h-10 mx-auto" aria-hidden />
        <p className="mt-3 text-h3 text-text">{outcome.text}</p>
      </section>
    );
  }

  const urgency = request.emergency?.urgency ?? 'HIGH';
  const snap = request.matchSnapshot ?? {};
  const busy = accept.isPending || reject.isPending;

  return (
    <section className="relative overflow-hidden bg-surface border-2 border-primary rounded-lg shadow-raised animate-fade-in" aria-live="assertive" aria-label="Incoming request">
      <div className={cn('h-1.5', URGENCY_BAR[urgency])} aria-hidden />
      <div className="p-5 text-center">
        <p className="text-caption uppercase tracking-wider font-bold text-text-muted">
          Request pending · <span className={urgency === 'CRITICAL' ? 'text-danger' : urgency === 'HIGH' ? 'text-warning' : 'text-text-muted'}>{urgency}</span>
        </p>
        <CountdownTimer expiresAt={request.expiresAt} offsetMs={offsetMs} totalSeconds={windowSeconds(request)} showBar className="mt-2 w-full items-center" />
        <p className="mt-4 text-h3 text-text">{requirementsText(request.emergency?.requirements)}</p>
        {request.emergency?.condition && (
          <p className="mt-1 text-small text-text-muted" data-testid="request-condition">
            Reported: {CONDITION_LABELS[request.emergency.condition] ?? request.emergency.condition}
          </p>
        )}
        <p className="mt-2 text-body text-text">
          <Ambulance className="w-5 h-5 text-primary inline-block align-[-4px] mr-1.5" aria-hidden />
          Ambulance est. <strong className="tabular-nums">{snap.etaMinutes ?? '—'} min</strong> away ({formatDistance(snap.distanceKm)})
        </p>
        <CrewContact crew={request.emergency?.ambulance} className="mt-3" />
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
      <RejectReasonModal isOpen={rejecting} onClose={() => setRejecting(false)} onConfirm={(reason) => reject.mutate(reason)} isLoading={reject.isPending} />
    </section>
  );
}
