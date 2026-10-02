import { z } from 'zod';
import { PHONE_PATTERN } from '../constants/ambulance.js';
import { CONDITION_VALUES, MAX_BOOKING_NOTES_LENGTH, MAX_PATIENT_NAME_LENGTH } from '../constants/booking.js';
import { URGENCY_VALUES } from '../constants/emergency.js';
import { idParams } from './common.js';

/** Public booking form. Exactly these fields — nothing else is accepted or stored (RULES.md §9). */
export const createBookingBody = z.strictObject({
  patientName: z.string().trim().min(2, 'Enter the patient name').max(MAX_PATIENT_NAME_LENGTH),
  phone: z
    .string()
    .trim()
    .refine((v) => PHONE_PATTERN.test(v.replace(/[\s-]/g, '')), 'Enter a valid Indian mobile number'),
  pickup: z.strictObject({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    label: z.string().trim().min(1, 'Pick the pickup location').max(300),
  }),
  notes: z.string().trim().max(MAX_BOOKING_NOTES_LENGTH).default(''),
  condition: z.enum(CONDITION_VALUES),
  urgency: z.enum(URGENCY_VALUES),
});

export const createBookingSchema = { body: createBookingBody };

/** The token is opaque; a wrong or malformed one is simply a 404 from the lookup. */
export const trackingTokenSchema = { params: z.object({ token: z.string().min(1).max(200) }) };

export const bookingOfferIdSchema = { params: idParams };

export const dutyBody = z.strictObject({ onDuty: z.boolean() });
export const dutySchema = { body: dutyBody };

/** Socket `ambulance:location`. */
export const locationPayload = z.strictObject({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
