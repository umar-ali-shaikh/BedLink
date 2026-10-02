import { notificationRepo } from '../../repositories/notificationRepo.js';
import { forbidden, notFound } from '../../utils/AppError.js';
import { errorMeta, logger } from '../../utils/logger.js';
import { idOf, sameId } from '../../utils/ids.js';

let io = null;
const listeners = new Set();

/** Called once by the socket layer. Services never touch `io` directly (RULES.md §7). */
export function attachIO(server) {
  io = server;
}

/** In-process listener (tests, diagnostics). Returns an unsubscribe function. */
export function onEmit(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Emit `event` to every room in `rooms` (deduplicated; a socket in several rooms gets it once). */
export function emit(event, rooms, payload) {
  const targets = [...new Set([].concat(rooms).filter(Boolean))];
  for (const listener of listeners) listener(event, targets, payload);
  if (!io || !targets.length) return;
  io.to(targets).emit(event, payload);
}

/** Persist a user-facing alert for reconnect catch-up. Never fails the calling flow. */
export async function notify({ userId = null, hospitalId = null, type, title, body = '', refId = null }) {
  try {
    await notificationRepo.create({ userId, hospitalId, type, title, body, refId });
  } catch (err) {
    logger.error('notification.persist_failed', { type, ...errorMeta(err) });
  }
}

export async function listNotifications(user, { unread } = {}) {
  return notificationRepo.listFor({ userId: user.id, hospitalId: user.hospitalId, unreadOnly: unread });
}

export async function markNotificationRead(id, user) {
  const existing = await notificationRepo.findById(id);
  if (!existing) throw notFound('Notification');
  const owns =
    sameId(existing.userId, user.id) || (existing.hospitalId && sameId(existing.hospitalId, user.hospitalId));
  if (!owns) throw forbidden();
  if (existing.readAt) return existing;
  return (await notificationRepo.markRead(idOf(existing))) ?? existing;
}
