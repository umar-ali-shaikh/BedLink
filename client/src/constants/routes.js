import { ROLES } from './roles';

/** Two panels: Ambulance (role DISPATCHER on the API) and Hospital. */
export const ROUTES = Object.freeze({
  LOGIN: '/login',
  REGISTER: '/register',
  REGISTER_AMBULANCE: '/register/ambulance',
  REGISTER_HOSPITAL: '/register/hospital',
  VERIFY_EMAIL: '/verify-email',
  DISPATCHER_DASHBOARD: '/ambulance/dashboard',
  DISPATCHER_NEW_EMERGENCY: '/ambulance/emergency/new',
  DISPATCHER_EMERGENCY_DETAIL: '/ambulance/emergency/:id',
  HOSPITAL_DASHBOARD: '/hospital/dashboard',
  HOSPITAL_BEDS: '/hospital/beds',
  HOSPITAL_REQUESTS: '/hospital/requests',
  HOSPITAL_PROFILE: '/hospital/profile',
  ADMIN_VERIFICATIONS: '/admin/verifications',
});

export const emergencyPath = (id) => ROUTES.DISPATCHER_EMERGENCY_DETAIL.replace(':id', id);

export const HOME_BY_ROLE = Object.freeze({
  [ROLES.DISPATCHER]: ROUTES.DISPATCHER_DASHBOARD,
  [ROLES.HOSPITAL]: ROUTES.HOSPITAL_DASHBOARD,
  [ROLES.ADMIN]: ROUTES.ADMIN_VERIFICATIONS,
});

/** Ambulance, Hospital and the admin verification panel. */
export const PANEL_ROLES = [ROLES.DISPATCHER, ROLES.HOSPITAL, ROLES.ADMIN];
