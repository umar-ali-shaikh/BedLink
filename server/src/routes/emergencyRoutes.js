import { Router } from 'express';
import * as emergencies from '../controllers/emergencyController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { actionLimiter } from '../middleware/rateLimit.js';
import { requireVerifiedAmbulance } from '../middleware/requireVerified.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createEmergencySchema,
  emergencyIdSchema,
  listEmergenciesSchema,
  requestHospitalSchema,
} from '../validators/emergency.js';

const { ADMIN, DISPATCHER, HOSPITAL } = ROLES;
const router = Router();

router.use(authenticate);
router.post(
  '/',
  authorize(DISPATCHER),
  requireVerifiedAmbulance,
  validate(createEmergencySchema),
  asyncHandler(emergencies.create)
);
router.get('/', authorize(DISPATCHER, ADMIN), validate(listEmergenciesSchema), asyncHandler(emergencies.list));
router.get('/:id', authorize(DISPATCHER, ADMIN, HOSPITAL), validate(emergencyIdSchema), asyncHandler(emergencies.get));
router.post(
  '/:id/request-hospital',
  authorize(DISPATCHER),
  requireVerifiedAmbulance,
  actionLimiter,
  validate(requestHospitalSchema),
  asyncHandler(emergencies.requestHospital)
);
router.post('/:id/cancel', authorize(DISPATCHER, ADMIN), validate(emergencyIdSchema), asyncHandler(emergencies.cancel));

export default router;
