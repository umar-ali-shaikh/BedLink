import { Router } from 'express';
import * as bookings from '../controllers/bookingController.js';
import { ROLES } from '../constants/roles.js';
import { OFFER_STATUS_VALUES } from '../constants/emergency.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { actionLimiter } from '../middleware/rateLimit.js';
import { requireVerifiedAmbulance } from '../middleware/requireVerified.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { bookingOfferIdSchema } from '../validators/booking.js';
import { statusListQuery } from '../validators/common.js';

const { DISPATCHER } = ROLES;
const router = Router();

router.use(authenticate, authorize(DISPATCHER));
router.get('/', validate({ query: statusListQuery(OFFER_STATUS_VALUES) }), asyncHandler(bookings.listOffers));
router.post(
  '/:id/accept',
  requireVerifiedAmbulance,
  actionLimiter,
  validate(bookingOfferIdSchema),
  asyncHandler(bookings.acceptOffer)
);
router.post(
  '/:id/reject',
  requireVerifiedAmbulance,
  actionLimiter,
  validate(bookingOfferIdSchema),
  asyncHandler(bookings.rejectOffer)
);

export default router;
