import * as bedService from '../services/bed/index.js';
import { created, ok } from '../utils/response.js';

export const list = async (req, res) => ok(res, await bedService.listBeds(req.params.id, req.user));
export const create = async (req, res) => created(res, await bedService.createBed(req.params.id, req.body, req.user));
export const updateStatus = async (req, res) =>
  ok(res, await bedService.updateBedStatus(req.params.id, req.body.status, req.user));
export const confirmAll = async (req, res) => ok(res, await bedService.confirmAllBeds(req.params.id, req.user));
