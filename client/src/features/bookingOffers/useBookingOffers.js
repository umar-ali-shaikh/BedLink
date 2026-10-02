import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingOffersApi } from '../booking/api';
import { useAuth } from '../auth/useAuth';
import { playAlert } from '../hospital/alertSound';
import { useToast } from '../../components/Toast';
import { CONDITION_LABELS } from '../../constants/booking';
import { OFFER_STATUS } from '../../constants/emergency';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import { qk } from '../../services/queryKeys';
import { useSocketEvents } from '../../socket/useSocketEvent';

/** Pending ambulance-booking offers for this crew, kept live by the socket. */
export function useBookingOffers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const enabled = user?.role === 'DISPATCHER' && user?.verificationStatus === 'VERIFIED';
  const query = useQuery({
    queryKey: qk.bookingOffers,
    queryFn: async () => ({ ...(await bookingOffersApi.list([OFFER_STATUS.PENDING])), fetchedAt: Date.now() }),
    enabled,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.bookingOffers });

  useSocketEvents(
    [SOCKET_EVENTS.BOOKING_OFFER, SOCKET_EVENTS.BOOKING_OFFER_CANCELLED, SOCKET_EVENTS.BOOKING_UPDATED],
    (event, payload) => {
      if (!enabled) return;
      refresh();
      if (event === SOCKET_EVENTS.BOOKING_OFFER) {
        playAlert();
        showToast({
          type: 'warning',
          title: `New ${payload.urgency?.toLowerCase() ?? ''} ambulance booking`,
          message: `${CONDITION_LABELS[payload.condition] ?? 'Emergency'} · pickup est. ${payload.etaMinutes ?? '—'} min away.`,
        });
      }
      if (event === SOCKET_EVENTS.BOOKING_OFFER_CANCELLED && payload.reason === OFFER_STATUS.CANCELLED) {
        showToast({ type: 'info', title: 'Booking withdrawn', message: 'The caller cancelled this booking.' });
      }
      if (event === SOCKET_EVENTS.BOOKING_UPDATED && payload.status === 'CANCELLED') {
        queryClient.invalidateQueries({ queryKey: qk.emergenciesAll });
        showToast({ type: 'warning', title: 'Booking cancelled', message: 'The caller cancelled; the linked emergency was closed.' });
      }
    }
  );
  return query;
}
