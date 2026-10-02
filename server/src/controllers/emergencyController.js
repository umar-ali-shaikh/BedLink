import * as emergencyService from '../services/emergency/index.js';
import { created, ok } from '../utils/response.js';

export const create = async (req, res) => created(res, await emergencyService.createEmergency(req.body, req.user));
export const list = async (req, res) => ok(res, await emergencyService.listEmergencies(req.user, req.query));
export const get = async (req, res) => ok(res, await emergencyService.getEmergency(req.params.id, req.user));
export const requestHospital = async (req, res) =>
  ok(res, await emergencyService.requestHospital(req.params.id, req.body ?? {}, req.user));
export const cancel = async (req, res) => ok(res, await emergencyService.cancelEmergency(req.params.id, req.user));
