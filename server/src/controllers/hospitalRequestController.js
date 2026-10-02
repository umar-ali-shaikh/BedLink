import * as emergencyService from '../services/emergency/index.js';
import { ok } from '../utils/response.js';

export const list = async (req, res) => ok(res, await emergencyService.listHospitalRequests(req.user, req.query));
export const accept = async (req, res) => ok(res, await emergencyService.acceptOffer(req.params.id, req.user));
export const reject = async (req, res) =>
  ok(res, await emergencyService.rejectOffer(req.params.id, req.body, req.user));
