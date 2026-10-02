import { Router } from 'express';
import * as analytics from '../controllers/analyticsController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/overview', authenticate, authorize(ROLES.ADMIN, ROLES.DISPATCHER), asyncHandler(analytics.overview));

export default router;
