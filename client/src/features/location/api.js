import api from '../../services/api';

export const geocodeApi = {
  search: (q) => api.get('/geocode/search', { params: { q } }),
  reverse: ({ lat, lng }) => api.get('/geocode/reverse', { params: { lat, lng } }),
};
