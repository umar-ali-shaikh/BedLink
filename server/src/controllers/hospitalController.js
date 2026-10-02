import * as hospitalService from '../services/hospital/index.js';
import { created, ok } from '../utils/response.js';

export const list = async (req, res) => ok(res, await hospitalService.listHospitals(req.query, req.user));
export const nearby = async (req, res) => ok(res, await hospitalService.nearbyHospitals(req.query));
export const get = async (req, res) => ok(res, await hospitalService.getHospital(req.params.id, req.user));
export const create = async (req, res) => created(res, await hospitalService.createHospital(req.body));
export const update = async (req, res) =>
  ok(res, await hospitalService.updateHospital(req.params.id, req.body, req.user));
