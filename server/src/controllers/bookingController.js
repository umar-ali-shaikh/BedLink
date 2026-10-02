import * as bookingService from '../services/booking/index.js';
import { created, ok } from '../utils/response.js';

export const create = async (req, res) => created(res, await bookingService.createBooking(req.body));
export const track = async (req, res) => ok(res, await bookingService.getTracking(req.params.token));
export const cancel = async (req, res) => ok(res, await bookingService.cancelBooking(req.params.token));
export const retry = async (req, res) => ok(res, await bookingService.retryBooking(req.params.token));

export const listOffers = async (req, res) => ok(res, await bookingService.listAmbulanceOffers(req.user, req.query));
export const acceptOffer = async (req, res) =>
  ok(res, await bookingService.acceptBookingOffer(req.params.id, req.user));
export const rejectOffer = async (req, res) =>
  ok(res, await bookingService.rejectBookingOffer(req.params.id, req.user));

export const cancelByAmbulance = async (req, res) =>
  ok(res, await bookingService.cancelBookingByAmbulance(req.params.id, req.user, req.body));
export const setDuty = async (req, res) => ok(res, await bookingService.setDuty(req.user, req.body.onDuty));
