import { env } from '../../config/env.js';
import { PII_PURGE_INTERVAL_MINUTES } from '../../constants/booking.js';
import { bookingRepo } from '../../repositories/bookingRepo.js';
import { logger } from '../../utils/logger.js';

const DAY_MS = 24 * 60 * 60_000;
let lastPurgeAt = 0;

/**
 * Retention (RULES.md §9): blank name, phone, notes, pickup and the tracking hash of bookings
 * closed more than BOOKING_PII_RETENTION_DAYS ago. Returns how many were purged.
 */
export async function purgeBookingPersonalData(now = new Date()) {
  const before = new Date(now.getTime() - env.BOOKING_PII_RETENTION_DAYS * DAY_MS);
  const purged = await bookingRepo.purgePersonalData(before, now);
  if (purged) logger.info('booking.pii_purged', { count: purged });
  return purged;
}

/** Sweeper hook: runs the purge at most once per PII_PURGE_INTERVAL_MINUTES. */
export async function purgeBookingPersonalDataIfDue(now = new Date()) {
  if (now.getTime() - lastPurgeAt < PII_PURGE_INTERVAL_MINUTES * 60_000) return 0;
  lastPurgeAt = now.getTime();
  return purgeBookingPersonalData(now);
}
