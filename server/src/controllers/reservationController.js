import * as reservationService from '../services/reservation/index.js';
import { created, ok } from '../utils/response.js';

export const list = async (req, res) => ok(res, await reservationService.listReservations(req.user, req.query));
export const create = async (req, res) =>
  created(res, await reservationService.createManualReservation(req.body, req.user));
export const release = async (req, res) =>
  ok(res, await reservationService.releaseReservation(req.params.id, req.user));
export const arrive = async (req, res) => ok(res, await reservationService.arriveReservation(req.params.id, req.user));
