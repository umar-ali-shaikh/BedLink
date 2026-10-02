import { ACTIVE_BOOKING_STATUSES, ASSIGNED_BOOKING_STATUSES, CLOSED_BOOKING_STATUSES } from '../constants/booking.js';
import { Booking } from '../models/index.js';

export const bookingRepo = {
  create: (data) => Booking.create(data),
  findById: (id) => Booking.findById(id),
  findByTokenHash: (trackingTokenHash) => Booking.findOne({ trackingTokenHash }),
  findByEmergency: (emergencyId) => Booking.findOne({ emergencyId }),
  findByIds: (ids) => Booking.find({ _id: { $in: ids } }),
  findActiveByPhone: (activePhone) => Booking.findOne({ activePhone }),
  countCreatedSince: (phone, since) => Booking.countDocuments({ phone, createdAt: { $gte: since } }),
  /** Ambulances currently holding a booking (assigned, on the way or at the pickup). */
  busyAmbulanceIds: async () =>
    (
      await Booking.find({ status: { $in: ASSIGNED_BOOKING_STATUSES } })
        .select('ambulanceId')
        .lean()
    ).map((b) => b.ambulanceId),
  findAssignedToAmbulance: (ambulanceId) =>
    Booking.findOne({ ambulanceId, status: { $in: ASSIGNED_BOOKING_STATUSES } }),
  /**
   * Conditional state change (RULES.md §11): applies `set` only when the booking is in one of
   * `fromStatuses` (and matches `extraFilter`). `unset` drops fields. Returns the doc or null.
   */
  transition: (id, fromStatuses, set, { extraFilter = {}, unset, push } = {}) => {
    const update = { $set: set };
    if (unset?.length) update.$unset = Object.fromEntries(unset.map((field) => [field, '']));
    if (push) update.$addToSet = push;
    return Booking.findOneAndUpdate({ _id: id, status: { $in: [].concat(fromStatuses) }, ...extraFilter }, update, {
      returnDocument: 'after',
    });
  },
  /** Attach the raised emergency, only while the booking is still assigned (not cancelled). */
  linkEmergency: (id, emergencyId) =>
    Booking.findOneAndUpdate(
      { _id: id, status: { $in: ASSIGNED_BOOKING_STATUSES } },
      { $set: { emergencyId } },
      { returnDocument: 'after' }
    ),
  /** Emergency finished or was cancelled by the crew: close the booking that raised it. */
  closeByEmergency: (emergencyId, status, now) =>
    Booking.findOneAndUpdate(
      { emergencyId, status: { $in: ACTIVE_BOOKING_STATUSES } },
      { $set: { status, closedAt: now }, $unset: { activePhone: '' } },
      { returnDocument: 'after' }
    ),
  /** Retention: blank the personal fields of bookings closed before `before`. Returns the count. */
  purgePersonalData: async (before, now) => {
    const result = await Booking.updateMany(
      { status: { $in: CLOSED_BOOKING_STATUSES }, closedAt: { $lte: before }, piiPurgedAt: null },
      {
        $set: { patientName: '', phone: '', notes: '', pickupLabel: '', piiPurgedAt: now },
        $unset: { pickupLocation: '', trackingTokenHash: '', activePhone: '' },
      }
    );
    return result.modifiedCount;
  },
};
