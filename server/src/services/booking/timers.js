import { ambulanceOfferRepo } from '../../repositories/ambulanceOfferRepo.js';
import { idOf } from '../../utils/ids.js';
import { errorMeta, logger } from '../../utils/logger.js';
import { expireBookingOffer } from './respond.js';

/** Same grace as hospital offers: never fire before `expiresAt` has passed on the DB clock. */
const TIMER_GRACE_MS = 25;
const timers = new Map();

/** In-process timer for one ambulance offer; the sweeper is the safety net after restarts. */
export function scheduleBookingOfferTimeout(offerId, expiresAt) {
  const key = idOf(offerId);
  clearBookingOfferTimeout(key);
  const delay = Math.max(0, new Date(expiresAt).getTime() - Date.now()) + TIMER_GRACE_MS;
  const handle = setTimeout(() => {
    timers.delete(key);
    expireBookingOffer(key, new Date()).catch((err) =>
      logger.error('booking.offer_timeout_failed', { offerId: key, ...errorMeta(err) })
    );
  }, delay);
  handle.unref?.();
  timers.set(key, handle);
}

export function clearBookingOfferTimeout(offerId) {
  const key = idOf(offerId);
  const handle = timers.get(key);
  if (handle) clearTimeout(handle);
  timers.delete(key);
}

export function clearAllBookingOfferTimeouts() {
  for (const handle of timers.values()) clearTimeout(handle);
  timers.clear();
}

/** Re-arm timers for offers that were pending when the process (re)started. */
export async function restoreBookingOfferTimers() {
  const pending = await ambulanceOfferRepo.findAllPending();
  for (const offer of pending) scheduleBookingOfferTimeout(offer._id, offer.expiresAt);
  return pending.length;
}

/** Sweeper step: time out every overdue PENDING ambulance offer. */
export async function expireOverdueBookingOffers(now = new Date()) {
  const overdue = await ambulanceOfferRepo.findOverdue(now);
  for (const offer of overdue) {
    try {
      await expireBookingOffer(offer._id, now);
    } catch (err) {
      logger.error('booking.offer_sweep_failed', { offerId: idOf(offer), ...errorMeta(err) });
    }
  }
  return overdue.length;
}
