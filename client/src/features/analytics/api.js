import api from '../../services/api';

export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
};
