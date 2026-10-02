import { Router } from 'express';
import { z } from 'zod';
import { geocodeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { reversePlace, searchPlaces } from '../services/geocode/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';

/** Public (hospital sign-up needs it), rate-limited, cached. */
const router = Router();

router.get(
  '/search',
  geocodeLimiter,
  validate({ query: z.strictObject({ q: z.string().trim().min(3, 'Type at least 3 characters').max(200) }) }),
  asyncHandler(async (req, res) => ok(res, await searchPlaces(req.query.q)))
);

router.get(
  '/reverse',
  geocodeLimiter,
  validate({
    query: z.strictObject({ lat: z.coerce.number().min(-90).max(90), lng: z.coerce.number().min(-180).max(180) }),
  }),
  asyncHandler(async (req, res) => ok(res, await reversePlace(req.query.lat, req.query.lng)))
);

export default router;
