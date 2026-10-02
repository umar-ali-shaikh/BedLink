/** Room name helpers (ARCHITECTURE.md §9.1). Never build room strings by hand. */
export const hospitalRoom = (hospitalId) => `hospital:${hospitalId}`;
export const dispatcherRoom = (userId) => `dispatcher:${userId}`;
export const roleRoom = (role) => `role:${role}`;
export const emergencyRoom = (emergencyId) => `emergency:${emergencyId}`;
/** The public caller of one booking; joined only by presenting its tracking token. */
export const bookingRoom = (bookingId) => `booking:${bookingId}`;
