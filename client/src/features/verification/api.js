import api from '../../services/api';

export const verificationApi = {
  summary: () => api.get('/admin/verifications/summary'),
  hospitals: (status) => api.get('/admin/verifications/hospitals', { params: { status } }),
  ambulances: (status) => api.get('/admin/verifications/ambulances', { params: { status } }),
  decideHospital: (id, decision, note) => api.post(`/admin/verifications/hospitals/${id}`, { decision, ...(note ? { note } : {}) }),
  decideAmbulance: (id, decision, note) => api.post(`/admin/verifications/ambulances/${id}`, { decision, ...(note ? { note } : {}) }),
};
