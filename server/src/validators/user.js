import { z } from 'zod';
import { ROLE_VALUES } from '../constants/roles.js';
import { idParams, objectId } from './common.js';

const password = z.string().min(8, 'Password must be at least 8 characters').max(200);

export const listUsersSchema = { query: z.strictObject({ role: z.enum(ROLE_VALUES).optional() }) };

export const createUserSchema = {
  body: z.strictObject({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    password,
    role: z.enum(ROLE_VALUES),
    hospitalId: objectId.nullable().optional(),
  }),
};

export const updateUserSchema = {
  params: idParams,
  body: z
    .strictObject({
      name: z.string().trim().min(2).max(100).optional(),
      role: z.enum(ROLE_VALUES).optional(),
      hospitalId: objectId.nullable().optional(),
      isActive: z.boolean().optional(),
      password: password.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update'),
};
