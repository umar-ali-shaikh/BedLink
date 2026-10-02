import api from '../../services/api';
import { statusParam } from '../../services/queryKeys';

export const emergencyApi = {
  create: (body) => api.post('/emergencies', body),
  list: (statuses) => api.get('/emergencies', { params: statusParam(statuses) }),
  get: (id) => api.get(`/emergencies/${id}`),
  /** Omit hospitalId to offer the current top candidate. */
  requestHospital: (id, hospitalId) => api.post(`/emergencies/${id}/request-hospital`, hospitalId ? { hospitalId } : {}),
  cancel: (id) => api.post(`/emergencies/${id}/cancel`),
};
