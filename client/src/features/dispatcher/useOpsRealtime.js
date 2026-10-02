import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvents } from '../../socket/useSocketEvent';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import { qk } from '../../services/queryKeys';

/** Dashboards: any bed / emergency / offer event refreshes the affected lists. */
export function useOpsRealtime() {
  const queryClient = useQueryClient();
  useSocketEvents(Object.values(SOCKET_EVENTS), (event) => {
    if (event === SOCKET_EVENTS.BED_UPDATED || event.startsWith('reservation:')) {
      queryClient.invalidateQueries({ queryKey: qk.hospitals });
    }
    if (event !== SOCKET_EVENTS.BED_UPDATED) {
      queryClient.invalidateQueries({ queryKey: qk.emergenciesAll });
      queryClient.invalidateQueries({ queryKey: qk.hospitalRequestsAll });
    }
    queryClient.invalidateQueries({ queryKey: qk.analytics });
  });
}
