import { z } from 'zod';
import { BED_TYPE_VALUES, EQUIPMENT_VALUES, STAFF_BED_STATUSES } from '../constants/bed.js';
import { enumList, idParams } from './common.js';

export const listBedsSchema = { params: idParams };

export const createBedSchema = {
  params: idParams,
  body: z.strictObject({
    label: z.string().trim().min(1).max(30),
    type: z.enum(BED_TYPE_VALUES),
    equipment: enumList(EQUIPMENT_VALUES).optional(),
    status: z.enum(STAFF_BED_STATUSES).optional(),
  }),
};

/** Staff can only set AVAILABLE / OCCUPIED / CLEANING / UNAVAILABLE (RULES.md §4). */
export const updateBedSchema = {
  params: idParams,
  body: z.strictObject({ status: z.enum(STAFF_BED_STATUSES) }),
};

export const confirmBedsSchema = { params: idParams };
