import api from '../../services/api';

export const bedsApi = {
  list: (hospitalId) => api.get(`/hospitals/${hospitalId}/beds`),
  create: (hospitalId, body) => api.post(`/hospitals/${hospitalId}/beds`, body),
  updateStatus: (bedId, status) => api.patch(`/beds/${bedId}`, { status }),
  confirmAll: (hospitalId) => api.post(`/hospitals/${hospitalId}/beds/confirm`),
};
