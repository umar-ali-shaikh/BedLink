import { SERVER_EVENTS } from '../../constants/socketEvents.js';
import { bookingRoom, dispatcherRoom } from '../../sockets/rooms.js';
import { idOf } from '../../utils/ids.js';
import { emit } from '../notification/index.js';

/** Rooms that follow a booking: the caller's tracking room and the assigned ambulance. */
export const bookingRooms = (booking) =>
  [bookingRoom(idOf(booking)), booking.ambulanceId ? dispatcherRoom(idOf(booking.ambulanceId)) : null].filter(Boolean);

/** Payload carries only the id and status; clients refetch the tracking view / offers. */
export function emitBookingUpdated(booking, extraRooms = []) {
  emit(SERVER_EVENTS.BOOKING_UPDATED, [...bookingRooms(booking), ...extraRooms], {
    bookingId: idOf(booking),
    status: booking.status,
  });
}

/** Tell an ambulance its offer is gone (answered elsewhere, timed out, or the caller cancelled). */
export function emitOfferCancelled(offer, reason) {
  emit(SERVER_EVENTS.BOOKING_OFFER_CANCELLED, [dispatcherRoom(idOf(offer.ambulanceId))], {
    offerId: idOf(offer),
    bookingId: idOf(offer.bookingId),
    reason,
  });
}
