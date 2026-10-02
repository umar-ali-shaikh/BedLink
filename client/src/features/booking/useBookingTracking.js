import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from './api';
import { useAuth } from '../auth/useAuth';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import { qk } from '../../services/queryKeys';
import { socket } from '../../socket';
import { useSocketEvents } from '../../socket/useSocketEvent';

/** Events that change what the tracking page shows; each triggers a refetch of the view. */
const REFRESH_EVENTS = [
  SOCKET_EVENTS.BOOKING_UPDATED,
  SOCKET_EVENTS.EMERGENCY_UPDATED,
  SOCKET_EVENTS.HOSPITAL_ACCEPTED,
  SOCKET_EVENTS.HOSPITAL_REJECTED,
  SOCKET_EVENTS.HOSPITAL_TIMEOUT,
  SOCKET_EVENTS.RESERVATION_CREATED,
  SOCKET_EVENTS.RESERVATION_EXPIRED,
  SOCKET_EVENTS.RESERVATION_RELEASED,
];

/**
 * Live view of one booking. REST holds the state; the socket (authorised by the tracking
 * token in the handshake, no login) only says "refetch", except the ambulance position,
 * which is patched straight into the cached view so the marker and ETA move smoothly.
 */
export function useBookingTracking(token) {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const key = qk.tracking(token);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => ({ ...(await bookingApi.track(token)), fetchedAt: Date.now() }),
    enabled: !!token,
    retry: (count, err) => count < 2 && err?.status !== 404,
  });
  const found = query.isSuccess;

  // (Re)connect the shared socket with the token. Signed-in crews/staff keep their cookie too.
  useEffect(() => {
    if (!token || authLoading || !found) return undefined;
    socket.auth = { bookingToken: token };
    if (socket.connected) socket.disconnect();
    socket.connect();
    return () => {
      socket.auth = {};
      socket.disconnect();
      if (user) socket.connect();
    };
  }, [token, authLoading, found, user]);

  useSocketEvents(REFRESH_EVENTS, () => queryClient.invalidateQueries({ queryKey: key }));

  useSocketEvents([SOCKET_EVENTS.BOOKING_AMBULANCE_LOCATION], (_event, payload) => {
    queryClient.setQueryData(key, (old) =>
      old?.ambulance
        ? {
            ...old,
            ambulance: {
              ...old.ambulance,
              location: payload.location,
              locationAt: payload.locationAt,
              etaMinutes: payload.etaMinutes,
              distanceKm: payload.distanceKm,
            },
          }
        : old
    );
  });

  return query;
}
