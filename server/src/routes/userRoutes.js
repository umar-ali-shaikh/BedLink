import { Router } from 'express';
import * as users from '../controllers/userController.js';
import { ROLES } from '../constants/roles.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createUserSchema, listUsersSchema, updateUserSchema } from '../validators/user.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));
router.get('/', validate(listUsersSchema), asyncHandler(users.list));
router.post('/', validate(createUserSchema), asyncHandler(users.create));
router.patch('/:id', validate(updateUserSchema), asyncHandler(users.update));

export default router;
