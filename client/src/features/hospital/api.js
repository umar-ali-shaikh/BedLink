import api from '../../services/api';
import { statusParam } from '../../services/queryKeys';

export const hospitalRequestsApi = {
  list: (statuses) => api.get('/hospital-requests', { params: statusParam(statuses) }),
  accept: (id) => api.post(`/hospital-requests/${id}/accept`),
  reject: (id, reason) => api.post(`/hospital-requests/${id}/reject`, { reason }),
};
