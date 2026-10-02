import { Router } from 'express';
import * as bookings from '../controllers/bookingController.js';
import { bookingLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createBookingSchema, trackingTokenSchema } from '../validators/booking.js';

/** Public: no login. The unguessable tracking token is the only credential. */
const router = Router();

router.post('/', bookingLimiter, validate(createBookingSchema), asyncHandler(bookings.create));
router.get('/track/:token', validate(trackingTokenSchema), asyncHandler(bookings.track));
router.post('/track/:token/cancel', validate(trackingTokenSchema), asyncHandler(bookings.cancel));
router.post('/track/:token/retry', validate(trackingTokenSchema), asyncHandler(bookings.retry));

export default router;
