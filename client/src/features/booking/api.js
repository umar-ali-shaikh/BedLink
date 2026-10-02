import api from '../../services/api';
import { statusParam } from '../../services/queryKeys';

/** Public: the tracking token is the only credential. */
export const bookingApi = {
  create: (body) => api.post('/bookings', body),
  track: (token) => api.get(`/bookings/track/${encodeURIComponent(token)}`),
  cancel: (token) => api.post(`/bookings/track/${encodeURIComponent(token)}/cancel`),
  retry: (token) => api.post(`/bookings/track/${encodeURIComponent(token)}/retry`),
};

/** Ambulance panel. */
export const bookingOffersApi = {
  list: (statuses) => api.get('/booking-offers', { params: statusParam(statuses) }),
  accept: (id) => api.post(`/booking-offers/${id}/accept`),
  reject: (id) => api.post(`/booking-offers/${id}/reject`),
};

export const dutyApi = {
  set: (onDuty) => api.post('/ambulance/duty', { onDuty }),
};
