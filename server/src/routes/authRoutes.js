import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema } from '../validators/auth.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(auth.login));
router.post('/logout', authenticate, auth.logout);
router.get('/me', authenticate, asyncHandler(auth.me));

export default router;
