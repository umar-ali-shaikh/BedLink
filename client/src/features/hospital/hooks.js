import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { hospitalsApi } from '../hospitals/api';
import { bedsApi } from '../beds/api';
import { hospitalRequestsApi } from './api';
import { reservationsApi } from '../reservations/api';
import { qk } from '../../services/queryKeys';
import { useSocketEvents } from '../../socket/useSocketEvent';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import { OFFER_STATUS, RESERVATION_STATUS } from '../../constants/emergency';
import { useToast } from '../../components/Toast';
import { playAlert } from './alertSound';
import { formatEta } from '../../utils/formatEta';

export function useMyHospitalId() {
  return useAuth().user?.hospitalId ?? null;
}

export function useMyHospital() {
  const id = useMyHospitalId();
  return useQuery({ queryKey: qk.hospital(id), queryFn: () => hospitalsApi.get(id), enabled: !!id });
}

export function useMyBeds() {
  const id = useMyHospitalId();
  return useQuery({ queryKey: qk.beds(id), queryFn: () => bedsApi.list(id), enabled: !!id });
}

/** `select` keeps serverNow + when we received it, for clock-skew-corrected countdowns. */
export function useHospitalRequests(statuses) {
  return useQuery({
    queryKey: qk.hospitalRequests(statuses?.join(',') ?? 'all'),
    queryFn: async () => ({ ...(await hospitalRequestsApi.list(statuses)), fetchedAt: Date.now() }),
  });
}

export function usePendingRequests() {
  return useHospitalRequests([OFFER_STATUS.PENDING]);
}

export function useActiveReservations() {
  return useQuery({
    queryKey: qk.reservations(RESERVATION_STATUS.ACTIVE),
    queryFn: () => reservationsApi.list([RESERVATION_STATUS.ACTIVE]),
  });
}

/**
 * One subscription for the whole hospital UI: socket events patch nothing by hand, they
 * invalidate the affected queries (ARCHITECTURE.md §4 state strategy) and raise alerts.
 */
export function useHospitalRealtime() {
  const queryClient = useQueryClient();
  const hospitalId = useMyHospitalId();
  const { showToast } = useToast();

  const refreshRequests = () => queryClient.invalidateQueries({ queryKey: qk.hospitalRequestsAll });
  const refreshBeds = () => {
    queryClient.invalidateQueries({ queryKey: qk.beds(hospitalId) });
    queryClient.invalidateQueries({ queryKey: qk.hospital(hospitalId) });
  };

  useSocketEvents(Object.values(SOCKET_EVENTS), (event, payload) => {
    switch (event) {
      case SOCKET_EVENTS.HOSPITAL_REQUEST:
        refreshRequests();
        playAlert();
        showToast({
          type: 'warning',
          title: `New ${payload.urgency?.toLowerCase() ?? ''} request`,
          message: `Ambulance est. ${formatEta(payload.etaMinutes)} away — respond within 2 minutes.`,
        });
        break;
      case SOCKET_EVENTS.HOSPITAL_REQUEST_CANCELLED:
        refreshRequests();
        showToast({ type: 'info', title: 'Request withdrawn', message: 'The dispatcher cancelled this emergency.' });
        break;
      case SOCKET_EVENTS.HOSPITAL_TIMEOUT:
        refreshRequests();
        showToast({ type: 'warning', title: 'Request timed out', message: 'No response in time — the next hospital is being contacted.' });
        break;
      case SOCKET_EVENTS.HOSPITAL_ACCEPTED:
      case SOCKET_EVENTS.HOSPITAL_REJECTED:
        refreshRequests();
        break;
      case SOCKET_EVENTS.RESERVATION_CREATED:
      case SOCKET_EVENTS.RESERVATION_RELEASED:
      case SOCKET_EVENTS.RESERVATION_EXPIRED:
        queryClient.invalidateQueries({ queryKey: qk.reservationsAll });
        refreshRequests();
        refreshBeds();
        if (event === SOCKET_EVENTS.RESERVATION_EXPIRED) {
          showToast({ type: 'info', title: 'Reservation expired', message: 'The held bed is available again.' });
        }
        break;
      case SOCKET_EVENTS.BED_UPDATED:
        if (!payload?.hospitalId || payload.hospitalId === hospitalId) refreshBeds();
        break;
      default:
    }
  });
}
