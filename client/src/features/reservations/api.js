import api from '../../services/api';
import { statusParam } from '../../services/queryKeys';

export const reservationsApi = {
  list: (statuses) => api.get('/reservations', { params: statusParam(statuses) }),
  release: (id) => api.post(`/reservations/${id}/release`),
  arrive: (id) => api.post(`/reservations/${id}/arrive`),
};
