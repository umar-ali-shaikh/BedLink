import { z } from 'zod';
import { OFFER_STATUS_VALUES, STAFF_REJECT_REASONS } from '../constants/emergency.js';
import { idParams, objectId, statusListQuery } from './common.js';

export const listHospitalRequestsSchema = { query: statusListQuery(OFFER_STATUS_VALUES) };

export const hospitalRequestIdSchema = { params: idParams };

export const rejectBody = z.strictObject({ reason: z.enum(STAFF_REJECT_REASONS) });

export const rejectSchema = { params: idParams, body: rejectBody };

/** Optional socket mutation `hospital:respond` (ARCHITECTURE.md §9.2). */
export const hospitalRespondPayload = z.discriminatedUnion('action', [
  z.strictObject({ hospitalRequestId: objectId, action: z.literal('ACCEPT') }),
  z.strictObject({ hospitalRequestId: objectId, action: z.literal('REJECT'), reason: z.enum(STAFF_REJECT_REASONS) }),
]);
