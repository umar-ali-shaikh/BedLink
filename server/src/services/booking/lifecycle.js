import { bookingRepo } from '../../repositories/bookingRepo.js';
import { emitBookingUpdated } from './events.js';

/**
 * Close the booking that raised an emergency when that emergency completes or is cancelled
 * by the crew. A no-op when the booking is already closed (e.g. the caller cancelled it).
 * Kept free of emergency-service imports so the emergency and reservation services can call it.
 */
export async function closeBookingForEmergency(emergencyId, status, now = new Date()) {
  const booking = await bookingRepo.closeByEmergency(emergencyId, status, now);
  if (booking) emitBookingUpdated(booking);
  return booking;
}
