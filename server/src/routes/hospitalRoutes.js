import { Router } from 'express';
import * as hospitals from '../controllers/hospitalController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createHospitalSchema,
  hospitalIdSchema,
  listHospitalsSchema,
  nearbySchema,
  updateHospitalSchema,
} from '../validators/hospital.js';

const { ADMIN, DISPATCHER, HOSPITAL } = ROLES;
const router = Router();

router.use(authenticate);
router.get('/', authorize(ADMIN, DISPATCHER), validate(listHospitalsSchema), asyncHandler(hospitals.list));
router.get('/nearby', authorize(ADMIN, DISPATCHER), validate(nearbySchema), asyncHandler(hospitals.nearby));
router.get('/:id', authorize(ADMIN, DISPATCHER, HOSPITAL), validate(hospitalIdSchema), asyncHandler(hospitals.get));
router.post('/', authorize(ADMIN), validate(createHospitalSchema), asyncHandler(hospitals.create));
router.patch('/:id', authorize(ADMIN, HOSPITAL), validate(updateHospitalSchema), asyncHandler(hospitals.update));

export default router;
