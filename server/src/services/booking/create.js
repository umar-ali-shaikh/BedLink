import { env } from '../../config/env.js';
import { PHONE_PATTERN } from '../../constants/ambulance.js';
import { bookingRepo } from '../../repositories/bookingRepo.js';
import { AppError } from '../../utils/AppError.js';
import { toPoint } from '../../utils/geo.js';
import { logger } from '../../utils/logger.js';
import { offerToNextAmbulance } from './dispatch.js';
import { assertPhoneNotBlocked } from './fakeReports.js';
import { generateTrackingToken, hashTrackingToken } from './token.js';
import { trackingView } from './track.js';

const HOUR_MS = 60 * 60_000;

/** `+91 98765-43210`, `098765 43210`, `9876543210` → `9876543210` (null when not an Indian mobile). */
export function normalisePhone(value) {
  const compact = String(value ?? '').replace(/[\s-]/g, '');
  return PHONE_PATTERN.test(compact) ? compact.slice(-10) : null;
}

const alreadyActive = () => new AppError('BOOKING_ALREADY_ACTIVE');

/**
 * `POST /api/bookings` (public). One active booking per phone number, and at most
 * BOOKING_RATE_LIMIT_PER_PHONE_PER_HOUR new bookings per number per hour (the per-IP limit is
 * middleware). Returns the tracking token once; only its hash is stored.
 */
export async function createBooking({ patientName, phone, pickup, notes, condition, urgency }, now = new Date()) {
  const normalised = normalisePhone(phone);
  if (!normalised)
    throw new AppError('VALIDATION_ERROR', undefined, undefined, [{ path: 'phone', message: 'Invalid phone number' }]);
  await assertPhoneNotBlocked(normalised, now);
  if (await bookingRepo.findActiveByPhone(normalised)) throw alreadyActive();
  const recent = await bookingRepo.countCreatedSince(normalised, new Date(now.getTime() - HOUR_MS));
  if (recent >= env.BOOKING_RATE_LIMIT_PER_PHONE_PER_HOUR) throw new AppError('RATE_LIMITED');

  const token = generateTrackingToken();
  let booking;
  try {
    booking = await bookingRepo.create({
      patientName,
      phone: normalised,
      activePhone: normalised,
      pickupLocation: toPoint(pickup),
      pickupLabel: pickup.label ?? '',
      notes: notes ?? '',
      condition,
      urgency,
      trackingTokenHash: hashTrackingToken(token),
    });
  } catch (err) {
    if (err?.code === 11000) throw alreadyActive();
    throw err;
  }
  logger.info('booking.created', { bookingId: booking._id.toString(), condition, urgency });
  // A dispatch failure must not lose the booking: it stays FINDING_AMBULANCE and can be retried.
  const dispatched = await offerToNextAmbulance(booking, { now }).catch((err) => {
    logger.error('booking.dispatch_failed', { bookingId: booking._id.toString(), message: err?.message });
    return booking;
  });
  return { token, booking: await trackingView(dispatched ?? booking) };
}
