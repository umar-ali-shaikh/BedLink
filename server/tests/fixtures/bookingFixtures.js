import { ROLES } from '../../src/constants/roles.js';
import { User } from '../../src/models/index.js';
import { hashPassword } from '../../src/services/auth/password.js';
import { DEMO_PASSWORDS } from './seedData.js';

/** Test-only pickup point and caller (Mumbai, next to the seeded test hospitals). */
export const PICKUP = Object.freeze({ lat: 19.076, lng: 72.8777, label: 'Test pickup, Mumbai' });

export const bookingBody = (overrides = {}) => ({
  patientName: 'Test Caller',
  phone: '9876500001',
  pickup: PICKUP,
  notes: 'Blue gate, ground floor',
  condition: 'BREATHING',
  urgency: 'CRITICAL',
  ...overrides,
});

/** `98765` + 5 digits, unique per n. */
export const phoneN = (n) => `98765${String(n).padStart(5, '0')}`;

let passwordHash;
let counter = 0;

/**
 * A test ambulance account. Logs in with `dispatcher…@bedlink.demo` + the DISPATCHER fixture
 * password (see helpers/testServer.js `passwordFor`).
 */
export async function createAmbulance({
  lat,
  lng,
  onDuty = true,
  locationAgeSeconds = 5,
  verificationStatus = 'VERIFIED',
  now = new Date(),
} = {}) {
  passwordHash ??= await hashPassword(DEMO_PASSWORDS.DISPATCHER);
  const n = ++counter;
  const hasPosition = lat != null && lng != null;
  const user = await User.create({
    name: `Crew ${n}`,
    email: `dispatcher-amb${n}@bedlink.demo`,
    passwordHash,
    role: ROLES.DISPATCHER,
    phone: `98000${String(n).padStart(5, '0')}`,
    verificationStatus,
    ambulance: {
      vehicleNumber: `MH01AB${String(1000 + n)}`,
      ambulanceType: 'ALS',
      driverName: `Driver ${n}`,
      licenceNumber: `MH14201100${String(n).padStart(5, '0')}`,
      organization: 'Test Ambulance Trust',
      onDuty,
      location: hasPosition ? { lat, lng } : undefined,
      locationAt: hasPosition ? new Date(now.getTime() - locationAgeSeconds * 1000) : null,
    },
  });
  return {
    user,
    id: user._id.toString(),
    email: user.email,
    authUser: { id: user._id.toString(), role: ROLES.DISPATCHER, verificationStatus },
  };
}
