/** One place for TanStack Query keys so socket handlers can invalidate precisely. */
export const qk = {
  me: ['auth', 'me'],
  hospitals: ['hospitals'],
  hospital: (id) => ['hospitals', id],
  nearby: (lat, lng) => ['hospitals', 'nearby', lat, lng],
  beds: (hospitalId) => ['beds', hospitalId],
  emergencies: (statuses = 'all') => ['emergencies', 'list', statuses],
  emergenciesAll: ['emergencies'],
  emergency: (id) => ['emergencies', 'detail', id],
  hospitalRequests: (statuses = 'all') => ['hospital-requests', statuses],
  hospitalRequestsAll: ['hospital-requests'],
  reservations: (statuses = 'all') => ['reservations', statuses],
  reservationsAll: ['reservations'],
  analytics: ['analytics', 'overview'],
  users: ['users'],
};

export const statusParam = (statuses) => (statuses?.length ? { status: statuses.join(',') } : undefined);
