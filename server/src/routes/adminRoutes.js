import { Router } from 'express';
import * as verification from '../controllers/verificationController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { decideSchema, listVerificationsSchema } from '../validators/verification.js';

/** Verification desk for self-registered hospitals and ambulances (ADMIN only). */
const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));
router.get('/verifications/summary', asyncHandler(verification.summary));
router.get('/verifications/hospitals', validate(listVerificationsSchema), asyncHandler(verification.hospitals));
router.get('/verifications/ambulances', validate(listVerificationsSchema), asyncHandler(verification.ambulances));
router.post('/verifications/hospitals/:id', validate(decideSchema), asyncHandler(verification.decideHospital));
router.post('/verifications/ambulances/:id', validate(decideSchema), asyncHandler(verification.decideAmbulance));

export default router;
