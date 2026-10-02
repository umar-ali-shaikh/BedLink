import { Router } from 'express';
import * as reservations from '../controllers/reservationController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createReservationSchema, listReservationsSchema, reservationIdSchema } from '../validators/reservation.js';

const { ADMIN, DISPATCHER, HOSPITAL } = ROLES;
const router = Router();

router.use(authenticate);
router.get(
  '/',
  authorize(ADMIN, DISPATCHER, HOSPITAL),
  validate(listReservationsSchema),
  asyncHandler(reservations.list)
);
router.post('/', authorize(ADMIN), validate(createReservationSchema), asyncHandler(reservations.create));
router.post(
  '/:id/release',
  authorize(ADMIN, DISPATCHER, HOSPITAL),
  validate(reservationIdSchema),
  asyncHandler(reservations.release)
);
router.post('/:id/arrive', authorize(HOSPITAL), validate(reservationIdSchema), asyncHandler(reservations.arrive));

export default router;
