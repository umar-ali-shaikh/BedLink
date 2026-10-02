import { Router } from 'express';
import * as offers from '../controllers/hospitalRequestController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { actionLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hospitalRequestIdSchema, listHospitalRequestsSchema, rejectSchema } from '../validators/hospitalRequest.js';

const { ADMIN, HOSPITAL } = ROLES;
const router = Router();

router.use(authenticate);
router.get('/', authorize(HOSPITAL, ADMIN), validate(listHospitalRequestsSchema), asyncHandler(offers.list));
router.post(
  '/:id/accept',
  authorize(HOSPITAL),
  actionLimiter,
  validate(hospitalRequestIdSchema),
  asyncHandler(offers.accept)
);
router.post('/:id/reject', authorize(HOSPITAL), actionLimiter, validate(rejectSchema), asyncHandler(offers.reject));

export default router;
