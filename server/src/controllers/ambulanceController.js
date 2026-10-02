import { updateAmbulanceProfile } from '../services/ambulance/profile.js';
import { ok } from '../utils/response.js';

export const updateProfile = async (req, res) => ok(res, await updateAmbulanceProfile(req.user, req.body));
