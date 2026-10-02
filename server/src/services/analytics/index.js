import { BED_TYPES, EQUIPMENT } from '../../constants/bed.js';
import { EMERGENCY_STATUS_VALUES, OFFER_STATUS } from '../../constants/emergency.js';
import { HOSPITAL_STATUS } from '../../constants/hospital.js';
import { bedRepo } from '../../repositories/bedRepo.js';
import { emergencyRepo } from '../../repositories/emergencyRepo.js';
import { hospitalRepo } from '../../repositories/hospitalRepo.js';
import { hospitalRequestRepo } from '../../repositories/hospitalRequestRepo.js';
import { reservationRepo } from '../../repositories/reservationRepo.js';

const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

/** PRD F11 KPIs via aggregations (no caching needed at MVP scale). */
export async function overview() {
  const activeHospitals = await hospitalRepo.list({ status: HOSPITAL_STATUS.ACTIVE });
  const activeIds = activeHospitals.map((h) => h._id);

  const [byStatus, offers, avgResponseSeconds, avgMatchingMs, icu, ventilator, activeReservations] = await Promise.all([
    emergencyRepo.countByStatus(),
    hospitalRequestRepo.countByStatus(),
    hospitalRequestRepo.averageResponseSeconds(),
    emergencyRepo.averageMatchingMs(),
    bedRepo.countAvailable({ hospitalId: { $in: activeIds }, type: BED_TYPES.ICU }),
    bedRepo.countAvailable({ hospitalId: { $in: activeIds }, equipment: EQUIPMENT.VENTILATOR }),
    reservationRepo.countActive(),
  ]);

  const emergenciesByStatus = Object.fromEntries(EMERGENCY_STATUS_VALUES.map((s) => [s, byStatus[s] ?? 0]));

  return {
    totalEmergencies: Object.values(emergenciesByStatus).reduce((a, b) => a + b, 0),
    emergenciesByStatus,
    offers: {
      accepted: offers[OFFER_STATUS.ACCEPTED] ?? 0,
      rejected: offers[OFFER_STATUS.REJECTED] ?? 0,
      timedOut: offers[OFFER_STATUS.TIMEOUT] ?? 0,
      pending: offers[OFFER_STATUS.PENDING] ?? 0,
      cancelled: offers[OFFER_STATUS.CANCELLED] ?? 0,
    },
    avgResponseSeconds: round1(avgResponseSeconds),
    avgMatchingMs: round1(avgMatchingMs),
    availableIcuBeds: icu,
    availableVentilatorBeds: ventilator,
    activeReservations,
    activeHospitals: activeHospitals.length,
    generatedAt: new Date(),
  };
}
