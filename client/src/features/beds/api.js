import api from '../../services/api';

export const bedApi = {
  getHospitalBeds: (hospitalId) => api.get(`/hospitals/${hospitalId}/beds`),
  updateBedStatus: (bedId, status) => api.patch(`/beds/${bedId}`, { status }),
  confirmAllBeds: (hospitalId) => api.post(`/hospitals/${hospitalId}/beds/confirm`),
  getBedSummary: () => api.get('/beds/summary'),
};
