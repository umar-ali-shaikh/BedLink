import api from '../../services/api';

export const usersApi = {
  list: () => api.get('/users'),
  create: (body) => api.post('/users', body),
  update: (id, body) => api.patch(`/users/${id}`, body),
};
