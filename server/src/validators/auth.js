import { z } from 'zod';
import { AMBULANCE_TYPE_VALUES, PHONE_PATTERN, VEHICLE_NUMBER_PATTERN } from '../constants/ambulance.js';
import { HFR_ID_PATTERN, REGISTRATION_NUMBER_PATTERN, SPECIALTY_VALUES } from '../constants/hospital.js';
import { coordinates, enumList } from './common.js';

export const loginSchema = {
  body: z.strictObject({
    email: z.email().max(254),
    password: z.string().min(1).max(200),
  }),
};

const strip = (v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '').toUpperCase() : v);

/** Strong-enough password for self-registration: 8+ chars with a letter and a digit. */
export const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(PHONE_PATTERN, 'Enter a valid 10-digit Indian mobile number'));

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(100);

const googleCredential = z.string().min(20).max(5000).optional();
const passwordOrGoogle = (body, password) => Boolean(password) || Boolean(body.googleCredential);
const passwordRequired = { message: 'Choose a password', path: ['password'] };

export const registerAmbulanceSchema = {
  body: z
    .strictObject({
      name,
      email: z.email().max(254),
      password: newPassword.optional(),
      googleCredential,
      phone,
      vehicleNumber: z.preprocess(
        strip,
        z.string().regex(VEHICLE_NUMBER_PATTERN, 'Enter a valid vehicle registration number, e.g. MH01AB1234')
      ),
      ambulanceType: z.enum(AMBULANCE_TYPE_VALUES),
      organization: z.string().trim().max(120).optional(),
    })
    .refine((b) => passwordOrGoogle(b, b.password), passwordRequired),
};

export const registerHospitalSchema = {
  body: z
    .strictObject({
      hospital: z.strictObject({
        name: z.string().trim().min(3, 'Hospital name must be at least 3 characters').max(120),
        address: z.string().trim().min(5, 'Enter the full address').max(300),
        coordinates,
        specialties: enumList(SPECIALTY_VALUES).default([]),
        registrationNumber: z.preprocess(
          (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v),
          z
            .string()
            .regex(
              REGISTRATION_NUMBER_PATTERN,
              'Registration number: 5–40 letters/digits (/, -, . allowed), as on your clinical establishment certificate'
            )
        ),
        hfrId: z.preprocess(
          (v) => (typeof v === 'string' && v.trim() ? strip(v) : undefined),
          z.string().regex(HFR_ID_PATTERN, 'ABDM Health Facility ID looks like IN2710000123').optional()
        ),
        phone,
        email: z.email('Enter the official hospital email').max(254),
      }),
      contact: z.strictObject({
        name,
        email: z.email().max(254),
        password: newPassword.optional(),
      }),
      googleCredential,
    })
    .refine((b) => passwordOrGoogle(b, b.contact.password), { ...passwordRequired, path: ['contact', 'password'] }),
};

export const googleSchema = { body: z.strictObject({ credential: z.string().min(20).max(5000) }) };
