import { hospitalRequestRepo } from '../../repositories/hospitalRequestRepo.js';
import { idOf } from '../../utils/ids.js';
import { errorMeta, logger } from '../../utils/logger.js';
import { expireOffer } from './respond.js';

/** Small grace so the timer never fires before `expiresAt` has passed on the DB clock. */
const TIMER_GRACE_MS = 25;
const timers = new Map();

/**
 * In-process timer for one offer (ARCHITECTURE.md §11.2). The sweeper is the safety net
 * after restarts; `expireOffer` is idempotent, so double firing is harmless.
 */
export function scheduleOfferTimeout(offerId, expiresAt) {
  const key = idOf(offerId);
  clearOfferTimeout(key);
  const delay = Math.max(0, new Date(expiresAt).getTime() - Date.now()) + TIMER_GRACE_MS;
  const handle = setTimeout(() => {
    timers.delete(key);
    expireOffer(key, new Date()).catch((err) =>
      logger.error('offer.timeout_failed', { offerId: key, ...errorMeta(err) })
    );
  }, delay);
  handle.unref?.();
  timers.set(key, handle);
}

export function clearOfferTimeout(offerId) {
  const key = idOf(offerId);
  const handle = timers.get(key);
  if (handle) clearTimeout(handle);
  timers.delete(key);
}

export function clearAllOfferTimeouts() {
  for (const handle of timers.values()) clearTimeout(handle);
  timers.clear();
}

/** Re-arm timers for offers that were pending when the process (re)started. */
export async function restorePendingTimers() {
  const pending = await hospitalRequestRepo.findAllPending();
  for (const offer of pending) scheduleOfferTimeout(offer._id, offer.expiresAt);
  return pending.length;
}

/** Sweeper step: time out every overdue PENDING offer. */
export async function expireOverdueOffers(now = new Date()) {
  const overdue = await hospitalRequestRepo.findOverdue(now);
  for (const offer of overdue) {
    try {
      await expireOffer(offer._id, now);
    } catch (err) {
      logger.error('offer.sweep_failed', { offerId: idOf(offer), ...errorMeta(err) });
    }
  }
  return overdue.length;
}
