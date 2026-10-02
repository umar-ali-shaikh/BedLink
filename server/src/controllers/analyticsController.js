import { overview as buildOverview } from '../services/analytics/index.js';
import { ok } from '../utils/response.js';

export const overview = async (_req, res) => ok(res, await buildOverview());
