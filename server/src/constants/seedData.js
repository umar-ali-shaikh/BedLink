/**
 * Simulated demo data only (RULES.md §9): fictional hospitals around Mumbai, no real
 * brands, no patient data. The default demo patient location is SEED_PATIENT_LOCATION.
 *
 * Designed so "ICU + Ventilator + Cardiology" from SEED_PATIENT_LOCATION shows ranked
 * candidates and every exclusion reason:
 *   Lakeside / City General / Eastwood / Greenfield (stale) → candidates
 *   Sunrise → MISSING_EQUIPMENT · Harbourview, Hilltop → MISSING_SPECIALTY
 *   St. Aurora → CRITICAL_LOAD · Westbay → NO_MATCHING_BED · Northgate → HOSPITAL_INACTIVE
 *   Far Coast → OUT_OF_RANGE
 */

export const SEED_PATIENT_LOCATION = Object.freeze({ lat: 19.076, lng: 72.8777 });

export const DEMO_PASSWORDS = Object.freeze({
  ADMIN: 'Admin@123',
  DISPATCHER: 'Dispatch@123',
  HOSPITAL: 'Hospital@123',
});

const A = 'AVAILABLE';
const O = 'OCCUPIED';
const C = 'CLEANING';
const U = 'UNAVAILABLE';

const ICU_VENT = { prefix: 'ICU', type: 'ICU', equipment: ['VENTILATOR', 'OXYGEN', 'CARDIAC_MONITOR'] };
const ICU_O2 = { prefix: 'ICU', type: 'ICU', equipment: ['OXYGEN'] };
const CARDIAC = { prefix: 'CCU', type: 'CARDIAC', equipment: ['CARDIAC_MONITOR', 'OXYGEN'] };
const BURNS = { prefix: 'BRN', type: 'BURNS', equipment: ['OXYGEN'] };
const GENERAL = { prefix: 'GEN', type: 'GENERAL', equipment: [] };
const GENERAL_O2 = { prefix: 'GEN', type: 'GENERAL', equipment: ['OXYGEN'] };

/**
 * `beds`: groups of `{ ...bedKind, statuses: [...] }` — one bed per status entry.
 * `availabilityAgeMinutes`: how long ago the beds were last confirmed (drives freshness).
 */
export const SEED_HOSPITALS = Object.freeze([
  {
    slug: 'lakeside',
    name: 'Lakeside Medical Centre',
    address: 'Lake Road, Powai (fictional)',
    coordinates: { lat: 19.1, lng: 72.89 },
    specialties: ['CARDIOLOGY', 'GENERAL_MEDICINE', 'NEUROLOGY'],
    currentLoad: 55,
    availabilityAgeMinutes: 0.5,
    beds: [
      { ...ICU_VENT, statuses: [A, A, A, O, O] },
      { ...CARDIAC, statuses: [A, O] },
      { ...GENERAL_O2, statuses: [A, A, O, C] },
    ],
  },
  {
    slug: 'citygeneral',
    name: 'City General Hospital',
    address: 'Station Road, Kurla (fictional)',
    coordinates: { lat: 19.05, lng: 72.86 },
    specialties: ['CARDIOLOGY', 'TRAUMA', 'GENERAL_MEDICINE'],
    currentLoad: 70,
    availabilityAgeMinutes: 1,
    beds: [
      { ...ICU_VENT, statuses: [A, A, O, O, C] },
      { ...CARDIAC, statuses: [A, A, O] },
      { ...GENERAL, statuses: [A, O, O, O] },
    ],
  },
  {
    slug: 'eastwood',
    name: 'Eastwood Medical',
    address: 'Eastern Express Hwy, Ghatkopar (fictional)',
    coordinates: { lat: 19.065, lng: 72.95 },
    specialties: ['CARDIOLOGY', 'GENERAL_MEDICINE'],
    currentLoad: 40,
    availabilityAgeMinutes: 6,
    beds: [
      { ...ICU_VENT, statuses: [A, O, O] },
      { ...CARDIAC, statuses: [A] },
      { ...GENERAL_O2, statuses: [A, A, A] },
    ],
  },
  {
    slug: 'greenfield',
    name: 'Greenfield Care Hospital',
    address: 'Link Road, Chembur (fictional)',
    coordinates: { lat: 19.03, lng: 72.9 },
    specialties: ['CARDIOLOGY', 'TRAUMA'],
    currentLoad: 45,
    availabilityAgeMinutes: 25,
    beds: [
      { ...ICU_VENT, statuses: [A, A, O] },
      { ...CARDIAC, statuses: [A, A] },
      { ...GENERAL, statuses: [A, A, O] },
    ],
  },
  {
    slug: 'sunrise',
    name: 'Sunrise Hospital',
    address: 'Hill Road, Bandra (fictional)',
    coordinates: { lat: 19.09, lng: 72.86 },
    specialties: ['CARDIOLOGY', 'GENERAL_MEDICINE'],
    currentLoad: 50,
    availabilityAgeMinutes: 1,
    beds: [
      // ICU beds without ventilators → MISSING_EQUIPMENT for ventilator requests.
      { ...ICU_O2, statuses: [A, A, O] },
      { ...CARDIAC, statuses: [A, O] },
      { ...GENERAL_O2, statuses: [A, A, O] },
    ],
  },
  {
    slug: 'harbourview',
    name: 'Harbourview Hospital',
    address: 'Harbour Lane, Colaba (fictional)',
    coordinates: { lat: 18.96, lng: 72.83 },
    specialties: ['TRAUMA', 'GENERAL_MEDICINE'],
    currentLoad: 60,
    availabilityAgeMinutes: 2,
    beds: [
      { ...ICU_VENT, statuses: [A, A, O] },
      { ...GENERAL, statuses: [A, A, A, O] },
    ],
  },
  {
    slug: 'staurora',
    name: 'St. Aurora Heart Institute',
    address: 'Ring Road, Vidyavihar (fictional)',
    coordinates: { lat: 19.07, lng: 72.92 },
    specialties: ['CARDIOLOGY'],
    currentLoad: 97,
    availabilityAgeMinutes: 1,
    beds: [
      { ...ICU_VENT, statuses: [A, O, O, O] },
      { ...CARDIAC, statuses: [A, O, O, O] },
    ],
  },
  {
    slug: 'riverside',
    name: 'Riverside Burns & Trauma Centre',
    address: 'River Road, Andheri (fictional)',
    coordinates: { lat: 19.12, lng: 72.84 },
    specialties: ['BURNS', 'TRAUMA'],
    currentLoad: 65,
    availabilityAgeMinutes: 3,
    beds: [
      { ...BURNS, statuses: [A, A, O, C] },
      { ...ICU_VENT, statuses: [A, O] },
      { ...GENERAL, statuses: [A, O] },
    ],
  },
  {
    slug: 'westbay',
    name: 'Westbay Community Hospital',
    address: 'Sea Face Road, Mahim (fictional)',
    coordinates: { lat: 19.06, lng: 72.83 },
    specialties: ['GENERAL_MEDICINE', 'CARDIOLOGY'],
    currentLoad: 35,
    availabilityAgeMinutes: 4,
    beds: [{ ...GENERAL_O2, statuses: [A, A, A, O, O, C] }],
  },
  {
    slug: 'hilltop',
    name: 'Hilltop Neuro Clinic',
    address: 'Hill Crest, Vikhroli (fictional)',
    coordinates: { lat: 19.14, lng: 72.93 },
    specialties: ['NEUROLOGY', 'GENERAL_MEDICINE'],
    currentLoad: 30,
    availabilityAgeMinutes: 1,
    beds: [
      { ...ICU_VENT, statuses: [A, A] },
      { ...GENERAL, statuses: [A, O] },
    ],
  },
  {
    slug: 'northgate',
    name: 'Northgate Hospital',
    address: 'North Gate, Goregaon (fictional)',
    coordinates: { lat: 19.15, lng: 72.88 },
    specialties: ['CARDIOLOGY', 'GENERAL_MEDICINE'],
    currentLoad: 50,
    status: 'INACTIVE',
    availabilityAgeMinutes: 60,
    beds: [
      { ...ICU_VENT, statuses: [A, U] },
      { ...GENERAL, statuses: [U, U] },
    ],
  },
  {
    slug: 'farcoast',
    name: 'Far Coast Hospital',
    address: 'Coastal Highway, Virar (fictional)',
    coordinates: { lat: 19.4, lng: 72.8 },
    specialties: ['CARDIOLOGY', 'TRAUMA', 'BURNS'],
    currentLoad: 20,
    availabilityAgeMinutes: 1,
    beds: [
      { ...ICU_VENT, statuses: [A, A, A] },
      { ...BURNS, statuses: [A] },
    ],
  },
]);

export const SEED_USERS = Object.freeze([
  { name: 'Asha Admin', email: 'admin@bedlink.demo', role: 'ADMIN' },
  { name: 'Dev Dispatcher', email: 'dispatcher1@bedlink.demo', role: 'DISPATCHER' },
  { name: 'Riya Dispatcher', email: 'dispatcher2@bedlink.demo', role: 'DISPATCHER' },
  // One HOSPITAL user per seeded hospital: <slug>@bedlink.demo
]);
