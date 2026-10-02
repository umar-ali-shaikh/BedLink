import { ASSIGNED_BOOKING_STATUSES, BOOKING_STATUS, CANCEL_REASONS, CANCELLED_BY } from '../../constants/booking.js';
import { bookingRepo } from '../../repositories/bookingRepo.js';
import { AppError, forbidden, notFound } from '../../utils/AppError.js';
import { sameId } from '../../utils/ids.js';
import { cancelEmergencyAs } from '../emergency/index.js';
import { userActor } from '../emergency/timeline.js';
import { emitBookingUpdated } from './events.js';
import { recordFakeReport } from './fakeReports.js';

/**
 * The assigned ambulance cancels a booking before the patient is picked up, with a reason
 * (fake, unreachable, duplicate, already transported, other). The booking flips to CANCELLED
 * first, then the existing emergency cancel runs: pending hospital offer withdrawn, held bed
 * released. FAKE_OR_PRANK also counts against the caller's phone number.
 */
export async function cancelBookingByAmbulance(bookingId, user, { reason, note = '' }, now = new Date()) {
  const booking = await bookingRepo.findById(bookingId);
  if (!booking) throw notFound('Booking');
  if (!sameId(booking.ambulanceId, user.id)) throw forbidden('This booking is assigned to another ambulance');
  if (!ASSIGNED_BOOKING_STATUSES.includes(booking.status)) {
    throw new AppError('INVALID_STATE_TRANSITION', `A ${booking.status} booking cannot be cancelled`);
  }
  const cancelled = await bookingRepo.transition(
    booking._id,
    ASSIGNED_BOOKING_STATUSES,
    {
      status: BOOKING_STATUS.CANCELLED,
      closedAt: now,
      cancelledBy: CANCELLED_BY.AMBULANCE,
      cancelReason: reason,
      cancelNote: note,
    },
    { unset: ['activePhone'], extraFilter: { ambulanceId: user.id } }
  );
  if (!cancelled) throw new AppError('INVALID_STATE_TRANSITION', 'The booking changed state, please refresh');
  if (cancelled.emergencyId) {
    await cancelEmergencyAs(cancelled.emergencyId, userActor(user), { cancelledBy: CANCELLED_BY.AMBULANCE, reason });
  }
  if (reason === CANCEL_REASONS.FAKE_OR_PRANK) await recordFakeReport(cancelled, now);
  emitBookingUpdated(cancelled);
  return { id: cancelled._id.toString(), status: cancelled.status, cancelReason: cancelled.cancelReason };
}
