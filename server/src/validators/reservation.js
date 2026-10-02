import { z } from 'zod';
import { RESERVATION_STATUS_VALUES } from '../constants/reservation.js';
import { idParams, objectId, statusListQuery } from './common.js';

export const createReservationSchema = {
  body: z.strictObject({ requestId: objectId, bedId: objectId }),
};

export const reservationIdSchema = { params: idParams };

export const listReservationsSchema = { query: statusListQuery(RESERVATION_STATUS_VALUES) };
