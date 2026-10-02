/** Error codes and their HTTP status (RULES.md §3.2). */
export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: { status: 400, message: 'Request validation failed' },
  UNAUTHORIZED: { status: 401, message: 'Authentication required' },
  INVALID_CREDENTIALS: { status: 401, message: 'Invalid email or password' },
  FORBIDDEN: { status: 403, message: 'You do not have access to this resource' },
  ACCOUNT_NOT_VERIFIED: { status: 403, message: 'Your account is waiting for verification by the BedLink team' },
  GOOGLE_AUTH_FAILED: { status: 401, message: 'Google sign-in failed — please try again' },
  GOOGLE_AUTH_DISABLED: { status: 404, message: 'Google sign-in is not enabled' },
  GOOGLE_ACCOUNT_NOT_FOUND: { status: 404, message: 'No BedLink account uses this Google email yet — register first' },
  RESOURCE_NOT_FOUND: { status: 404, message: 'Resource not found' },
  INVALID_STATE_TRANSITION: { status: 409, message: 'This action is not allowed in the current state' },
  DUPLICATE_RESOURCE: { status: 409, message: 'A resource with these details already exists' },
  OFFER_ALREADY_PENDING: { status: 409, message: 'A hospital request is already pending' },
  OFFER_EXPIRED: { status: 409, message: 'This request has expired' },
  OFFER_ALREADY_RESOLVED: { status: 409, message: 'This request has already been answered' },
  HOSPITAL_NO_LONGER_MATCHES: { status: 409, message: 'This hospital no longer matches the requirements' },
  BED_NOT_AVAILABLE: { status: 409, message: 'No matching bed is available anymore' },
  DUPLICATE_RESERVATION: { status: 409, message: 'This bed or request already has an active reservation' },
  RESERVATION_EXPIRED: { status: 409, message: 'This reservation has expired' },
  GEOCODER_UNAVAILABLE: { status: 503, message: 'Address search is unavailable right now — try again shortly' },
  RATE_LIMITED: { status: 429, message: 'Too many requests, please slow down' },
  INTERNAL_ERROR: { status: 500, message: 'Something went wrong' },
});

/** Not an error: an emergency returned with status NO_MATCH (HTTP 200). */
export const NO_MATCHING_HOSPITALS = 'NO_MATCHING_HOSPITALS';
