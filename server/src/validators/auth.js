import { z } from 'zod';

export const loginSchema = {
  body: z.strictObject({
    email: z.email().max(254),
    password: z.string().min(1).max(200),
  }),
};
