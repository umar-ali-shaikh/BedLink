import { OFFER_STATUS } from '../constants/emergency.js';
import { AmbulanceOffer } from '../models/index.js';

export const ambulanceOfferRepo = {
  create: (data) => AmbulanceOffer.create(data),
  findById: (id) => AmbulanceOffer.findById(id),
  findPendingByBooking: (bookingId) => AmbulanceOffer.findOne({ bookingId, status: OFFER_STATUS.PENDING }),
  countByBooking: (bookingId) => AmbulanceOffer.countDocuments({ bookingId }),
  /** Offers shown on an ambulance's page, with the booking they are for. */
  listForAmbulance: (ambulanceId, statuses) =>
    AmbulanceOffer.find({ ambulanceId, ...(statuses?.length ? { status: { $in: statuses } } : {}) })
      .sort({ offeredAt: -1 })
      .limit(20)
      .populate('bookingId'),
  pendingAmbulanceIds: async () =>
    (await AmbulanceOffer.find({ status: OFFER_STATUS.PENDING }).select('ambulanceId').lean()).map(
      (o) => o.ambulanceId
    ),
  /** The single allowed transition PENDING → `to`; whoever writes first wins (ARCHITECTURE.md §7.3). */
  resolvePending: (id, to, set = {}, { notExpiredAt, expiredAt } = {}) => {
    const filter = { _id: id, status: OFFER_STATUS.PENDING };
    if (notExpiredAt) filter.expiresAt = { $gt: notExpiredAt };
    if (expiredAt) filter.expiresAt = { $lte: expiredAt };
    return AmbulanceOffer.findOneAndUpdate(filter, { $set: { status: to, ...set } }, { returnDocument: 'after' });
  },
  findOverdue: (now) => AmbulanceOffer.find({ status: OFFER_STATUS.PENDING, expiresAt: { $lte: now } }).select('_id'),
  findAllPending: () => AmbulanceOffer.find({ status: OFFER_STATUS.PENDING }).select('_id expiresAt'),
};
