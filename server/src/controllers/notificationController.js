import { listNotifications, markNotificationRead } from '../services/notification/index.js';
import { ok } from '../utils/response.js';

export const list = async (req, res) => ok(res, await listNotifications(req.user, req.query));
export const markRead = async (req, res) => ok(res, await markNotificationRead(req.params.id, req.user));
