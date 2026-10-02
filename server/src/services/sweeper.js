import { env } from '../config/env.js';
import { errorMeta, logger } from '../utils/logger.js';
import { expireOverdueBookingOffers, purgeBookingPersonalDataIfDue } from './booking/index.js';
import { expireOverdueOffers } from './emergency/index.js';
import { expireOverdueReservations } from './reservation/index.js';

let interval = null;
let running = false;

/**
 * One sweep: time out overdue hospital and ambulance offers, expire overdue holds, and run
 * the booking retention purge when due. Recovers work that an
 * in-process timer missed (e.g. after a Render restart). Skips if a sweep is running.
 */
export async function sweepOnce(now = new Date()) {
  if (running) return { skipped: true };
  running = true;
  try {
    const offers = await expireOverdueOffers(now);
    const reservations = await expireOverdueReservations(now);
    const bookingOffers = await expireOverdueBookingOffers(now);
    const purgedBookings = await purgeBookingPersonalDataIfDue(now);
    if (offers || reservations || bookingOffers || purgedBookings) {
      logger.info('sweeper.run', { offers, reservations, bookingOffers, purgedBookings });
    }
    return { offers, reservations, bookingOffers, purgedBookings };
  } catch (err) {
    logger.error('sweeper.failed', errorMeta(err));
    return { error: true };
  } finally {
    running = false;
  }
}

export function startSweeper() {
  stopSweeper();
  interval = setInterval(() => void sweepOnce(), env.SWEEPER_INTERVAL_SECONDS * 1000);
  interval.unref?.();
}

export function stopSweeper() {
  if (interval) clearInterval(interval);
  interval = null;
}
