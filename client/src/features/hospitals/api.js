import api from '../../services/api';

export const hospitalsApi = {
  list: (params) => api.get('/hospitals', { params }),
  nearby: ({ lat, lng, radiusKm }) => api.get('/hospitals/nearby', { params: { lat, lng, radiusKm } }),
  get: (id) => api.get(`/hospitals/${id}`),
  create: (body) => api.post('/hospitals', body),
  update: (id, body) => api.patch(`/hospitals/${id}`, body),
};
