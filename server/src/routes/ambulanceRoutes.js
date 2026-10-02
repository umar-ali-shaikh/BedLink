import { Router } from 'express';
import * as ambulance from '../controllers/ambulanceController.js';
import * as bookings from '../controllers/bookingController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { actionLimiter } from '../middleware/rateLimit.js';
import { requireVerifiedAmbulance } from '../middleware/requireVerified.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ambulanceProfileSchema, cancelBookingSchema, dutySchema } from '../validators/booking.js';

const router = Router();

/** On-duty toggle: only on-duty, verified ambulances with a recent position receive bookings. */
router.post(
  '/duty',
  authenticate,
  authorize(ROLES.DISPATCHER),
  requireVerifiedAmbulance,
  actionLimiter,
  validate(dutySchema),
  asyncHandler(bookings.setDuty)
);

router.post(
  '/bookings/:id/cancel',
  authenticate,
  authorize(ROLES.DISPATCHER),
  requireVerifiedAmbulance,
  actionLimiter,
  validate(cancelBookingSchema),
  asyncHandler(bookings.cancelByAmbulance)
);

/** Phone and organisation only. */
router.patch(
  '/profile',
  authenticate,
  authorize(ROLES.DISPATCHER),
  validate(ambulanceProfileSchema),
  asyncHandler(ambulance.updateProfile)
);

export default router;
