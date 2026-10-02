import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { emergencyApi } from '../dispatcher/api';
import { qk } from '../../services/queryKeys';
import { socket } from '../../socket';
import { CLIENT_EVENTS, SOCKET_EVENTS } from '../../constants/socketEvents';
import { useSocketEvents } from '../../socket/useSocketEvent';

const EMERGENCY_EVENTS = [
  SOCKET_EVENTS.EMERGENCY_UPDATED,
  SOCKET_EVENTS.HOSPITAL_ACCEPTED,
  SOCKET_EVENTS.HOSPITAL_REJECTED,
  SOCKET_EVENTS.HOSPITAL_TIMEOUT,
  SOCKET_EVENTS.RESERVATION_CREATED,
  SOCKET_EVENTS.RESERVATION_EXPIRED,
  SOCKET_EVENTS.RESERVATION_RELEASED,
];

/**
 * Live emergency: REST for state, socket events (filtered by id) trigger a refetch.
 * Joins `emergency:<id>` on mount and after every reconnect.
 */
export function useEmergency(id, { onEvent } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: qk.emergency(id),
    queryFn: async () => ({ ...(await emergencyApi.get(id)), fetchedAt: Date.now() }),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return undefined;
    const join = () => socket.emit(CLIENT_EVENTS.JOIN_DISPATCHER, { emergencyId: id }, () => {});
    if (socket.connected) join();
    socket.on('connect', join);
    return () => socket.off('connect', join);
  }, [id]);

  useSocketEvents(EMERGENCY_EVENTS, (event, payload) => {
    if (payload?.emergencyId !== id) return;
    queryClient.invalidateQueries({ queryKey: qk.emergency(id) });
    onEvent?.(event, payload);
  });

  return query;
}
