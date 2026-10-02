import * as userService from '../services/user/index.js';
import { created, ok } from '../utils/response.js';

export const list = async (req, res) => ok(res, await userService.listUsers(req.query));
export const create = async (req, res) => created(res, await userService.createUser(req.body));
export const update = async (req, res) => ok(res, await userService.updateUser(req.params.id, req.body));
