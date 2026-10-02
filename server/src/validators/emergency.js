import { z } from 'zod';
import { BED_TYPE_VALUES, EQUIPMENT_VALUES } from '../constants/bed.js';
import { EMERGENCY_STATUS_VALUES, URGENCY_VALUES } from '../constants/emergency.js';
import { SPECIALTY_VALUES } from '../constants/hospital.js';
import { coordinates, enumList, idParams, objectId, statusListQuery } from './common.js';

/** No patient name, phone, Aadhaar or notes — those fields simply do not exist (RULES.md §9). */
export const emergencyBody = z.strictObject({
  patientLocation: coordinates,
  requirements: z.strictObject({
    bedType: z.enum(BED_TYPE_VALUES),
    equipment: enumList(EQUIPMENT_VALUES).default([]),
    specialties: enumList(SPECIALTY_VALUES).default([]),
  }),
  urgency: z.enum(URGENCY_VALUES).optional(),
});

export const createEmergencySchema = { body: emergencyBody };

export const listEmergenciesSchema = { query: statusListQuery(EMERGENCY_STATUS_VALUES) };

export const emergencyIdSchema = { params: idParams };

export const requestHospitalSchema = {
  params: idParams,
  body: z.strictObject({ hospitalId: objectId.optional() }),
};
