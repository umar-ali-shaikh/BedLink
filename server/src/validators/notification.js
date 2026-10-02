import { z } from 'zod';
import { booleanString, idParams } from './common.js';

export const listNotificationsSchema = { query: z.strictObject({ unread: booleanString.optional() }) };

export const notificationIdSchema = { params: idParams };
