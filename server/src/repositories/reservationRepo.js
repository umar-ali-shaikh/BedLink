import { Reservation } from '../models/index.js';
import { RESERVATION_STATUS } from '../constants/reservation.js';

export const reservationRepo = {
  /** `Model.create([doc], { session })` is the transaction-safe form. */
  create: async (data, { session } = {}) => {
    const [doc] = await Reservation.create([data], { session });
    return doc;
  },
  findById: (id) => Reservation.findById(id),
  findWithBed: (id) => Reservation.findById(id).populate('bedId', 'label type equipment status'),
  list: (filter = {}, { limit = 100 } = {}) =>
    Reservation.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('bedId', 'label type equipment')
      .populate('hospitalId', 'name'),
  findByHospitalRequestIds: (ids) =>
    Reservation.find({ hospitalRequestId: { $in: ids } }).populate('bedId', 'label type equipment'),
  findActiveByRequest: (requestId) => Reservation.findOne({ requestId, status: RESERVATION_STATUS.ACTIVE }),

  /** Conditional ACTIVE → `to`. `notExpiredAt` / `expiredAt` add an expiry condition. */
  resolveActive: (id, to, { notExpiredAt, expiredAt } = {}) => {
    const filter = { _id: id, status: RESERVATION_STATUS.ACTIVE };
    if (notExpiredAt) filter.expiresAt = { $gt: notExpiredAt };
    if (expiredAt) filter.expiresAt = { $lte: expiredAt };
    return Reservation.findOneAndUpdate(filter, { $set: { status: to } }, { returnDocument: 'after' });
  },

  deleteById: (id) => Reservation.deleteOne({ _id: id }),
  findOverdue: (now) => Reservation.find({ status: RESERVATION_STATUS.ACTIVE, expiresAt: { $lte: now } }).select('_id'),
  countActive: () => Reservation.countDocuments({ status: RESERVATION_STATUS.ACTIVE }),
};
