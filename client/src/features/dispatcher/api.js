import api from '../../services/api';

export const emergencyApi = {
  createEmergency: (data) => api.post('/emergencies', data),
  getEmergency: (id) => api.get(`/emergencies/${id}`),
  getActiveEmergencies: () => api.get('/emergencies?active=true'),
  getAllEmergencies: (params) => api.get('/emergencies', { params }),
  requestHospital: (emergencyId, hospitalId) => api.post(`/emergencies/${emergencyId}/request-hospital`, { hospitalId }),
  cancelEmergency: (emergencyId, reason) => api.post(`/emergencies/${emergencyId}/cancel`, { reason }),
  releaseReservation: (reservationId) => api.post(`/reservations/${reservationId}/release`),
  markPatientArrived: (reservationId) => api.post(`/reservations/${reservationId}/arrive`),
};
