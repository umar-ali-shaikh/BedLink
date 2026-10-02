import { ROLES } from './roles';

export const ROUTES = Object.freeze({
  LOGIN: '/login',
  DISPATCHER_DASHBOARD: '/dispatcher/dashboard',
  DISPATCHER_NEW_EMERGENCY: '/dispatcher/emergency/new',
  DISPATCHER_EMERGENCY_DETAIL: '/dispatcher/emergency/:id',
  HOSPITAL_DASHBOARD: '/hospital/dashboard',
  HOSPITAL_BEDS: '/hospital/beds',
  HOSPITAL_REQUESTS: '/hospital/requests',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_HOSPITALS: '/admin/hospitals',
  ADMIN_USERS: '/admin/users',
  ADMIN_EMERGENCIES: '/admin/emergencies',
  ADMIN_EMERGENCY_DETAIL: '/admin/emergency/:id',
});

export const emergencyPath = (id, role = ROLES.DISPATCHER) =>
  (role === ROLES.ADMIN ? ROUTES.ADMIN_EMERGENCY_DETAIL : ROUTES.DISPATCHER_EMERGENCY_DETAIL).replace(':id', id);

export const HOME_BY_ROLE = Object.freeze({
  [ROLES.ADMIN]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.DISPATCHER]: ROUTES.DISPATCHER_DASHBOARD,
  [ROLES.HOSPITAL]: ROUTES.HOSPITAL_DASHBOARD,
});
