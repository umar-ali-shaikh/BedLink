import { z } from 'zod';
import { HOSPITAL_STATUS_VALUES, SPECIALTY_VALUES } from '../constants/hospital.js';
import { coordinates, enumList, idParams } from './common.js';
import { phone } from './auth.js';

const hospitalFields = {
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(300),
  coordinates,
  specialties: enumList(SPECIALTY_VALUES),
  currentLoad: z.number().int().min(0).max(100),
  status: z.enum(HOSPITAL_STATUS_VALUES),
  phone,
  contactName: z.string().trim().min(2).max(100),
};

export const listHospitalsSchema = {
  query: z.strictObject({ status: z.enum(HOSPITAL_STATUS_VALUES).optional() }),
};

export const nearbySchema = {
  query: z.strictObject({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().positive().max(500).optional(),
  }),
};

export const hospitalIdSchema = { params: idParams };

export const createHospitalSchema = {
  body: z.strictObject({
    name: hospitalFields.name,
    address: hospitalFields.address.optional(),
    coordinates: hospitalFields.coordinates,
    specialties: hospitalFields.specialties.optional(),
    currentLoad: hospitalFields.currentLoad.optional(),
    status: hospitalFields.status.optional(),
  }),
};

export const updateHospitalSchema = {
  params: idParams,
  body: z
    .strictObject(Object.fromEntries(Object.entries(hospitalFields).map(([k, v]) => [k, v.optional()])))
    .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update'),
};
