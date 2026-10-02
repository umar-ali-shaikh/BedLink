import { Router } from 'express';
import * as beds from '../controllers/bedController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { confirmBedsSchema, createBedSchema, listBedsSchema, updateBedSchema } from '../validators/bed.js';

const { ADMIN, DISPATCHER, HOSPITAL } = ROLES;
const router = Router();

// Mounted at /api root, so authenticate per route instead of router.use().
router.get(
  '/hospitals/:id/beds',
  authenticate,
  authorize(ADMIN, DISPATCHER, HOSPITAL),
  validate(listBedsSchema),
  asyncHandler(beds.list)
);
router.post(
  '/hospitals/:id/beds',
  authenticate,
  authorize(ADMIN),
  validate(createBedSchema),
  asyncHandler(beds.create)
);
router.post(
  '/hospitals/:id/beds/confirm',
  authenticate,
  authorize(ADMIN, HOSPITAL),
  validate(confirmBedsSchema),
  asyncHandler(beds.confirmAll)
);
router.patch(
  '/beds/:id',
  authenticate,
  authorize(ADMIN, HOSPITAL),
  validate(updateBedSchema),
  asyncHandler(beds.updateStatus)
);

export default router;
