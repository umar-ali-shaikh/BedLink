import { Router } from 'express';
import * as notifications from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listNotificationsSchema, notificationIdSchema } from '../validators/notification.js';

const router = Router();

router.use(authenticate);
router.get('/', validate(listNotificationsSchema), asyncHandler(notifications.list));
router.patch('/:id/read', validate(notificationIdSchema), asyncHandler(notifications.markRead));

export default router;
