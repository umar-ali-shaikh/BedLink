import { z } from 'zod';
import { idParams } from './common.js';

const status = z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'ALL']).optional();

export const listVerificationsSchema = { query: z.strictObject({ status }) };

export const decideSchema = {
  params: idParams,
  body: z.strictObject({
    decision: z.enum(['VERIFY', 'REJECT']),
    note: z.string().trim().max(500).optional(),
  }),
};
