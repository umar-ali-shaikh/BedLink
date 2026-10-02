import * as verification from '../services/verification/index.js';
import { ok } from '../utils/response.js';

export const summary = async (_req, res) => ok(res, await verification.verificationSummary());
export const hospitals = async (req, res) => ok(res, await verification.listHospitalVerifications(req.query));
export const ambulances = async (req, res) => ok(res, await verification.listAmbulanceVerifications(req.query));
export const decideHospital = async (req, res) =>
  ok(res, await verification.decideHospital(req.params.id, req.body, req.user));
export const decideAmbulance = async (req, res) =>
  ok(res, await verification.decideAmbulance(req.params.id, req.body, req.user));
