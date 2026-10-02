import api from '../../services/api';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  registerAmbulance: (body) => api.post('/auth/register/ambulance', body),
  registerHospital: (body) => api.post('/auth/register/hospital', body),
  config: () => api.get('/auth/config'),
  google: (credential) => api.post('/auth/google', { credential }),
};
