import { HospitalRequest } from '../models/index.js';
import { OFFER_STATUS } from '../constants/emergency.js';

export const hospitalRequestRepo = {
  create: (data) => HospitalRequest.create(data),
  findById: (id, { session } = {}) => HospitalRequest.findById(id).session(session ?? null),
  findByEmergency: (emergencyId) => HospitalRequest.find({ emergencyId }).sort({ offeredAt: 1 }),
  findPendingByEmergency: (emergencyId) => HospitalRequest.findOne({ emergencyId, status: OFFER_STATUS.PENDING }),
  countByEmergency: (emergencyId) => HospitalRequest.countDocuments({ emergencyId }),

  list: (filter = {}, { limit = 100 } = {}) =>
    HospitalRequest.find(filter)
      .sort({ offeredAt: -1 })
      .limit(limit)
      .populate('emergencyId', 'requirements urgency demoPatientId status reservationId'),

  /**
   * The single allowed transition PENDING → `to` (ARCHITECTURE.md §7.3). Whoever writes
   * first wins; everyone else gets null. `notExpiredAt` adds `expiresAt > now`,
   * `expiredAt` adds `expiresAt <= now`.
   */
  resolvePending: (id, to, set = {}, { session, notExpiredAt, expiredAt } = {}) => {
    const filter = { _id: id, status: OFFER_STATUS.PENDING };
    if (notExpiredAt) filter.expiresAt = { $gt: notExpiredAt };
    if (expiredAt) filter.expiresAt = { $lte: expiredAt };
    return HospitalRequest.findOneAndUpdate(
      filter,
      { $set: { status: to, ...set } },
      { returnDocument: 'after', session }
    );
  },

  /** Accept found no bed: PENDING (transaction rolled back) or ACCEPTED (no transactions) → REJECTED. */
  markNoBedAtAccept: (id, set) =>
    HospitalRequest.findOneAndUpdate(
      { _id: id, status: { $in: [OFFER_STATUS.PENDING, OFFER_STATUS.ACCEPTED] } },
      { $set: { status: OFFER_STATUS.REJECTED, ...set } },
      { returnDocument: 'after' }
    ),

  findOverdue: (now) =>
    HospitalRequest.find({ status: OFFER_STATUS.PENDING, expiresAt: { $lte: now } }).select('_id expiresAt'),

  findAllPending: () => HospitalRequest.find({ status: OFFER_STATUS.PENDING }).select('_id expiresAt'),

  /** Most recent TIMEOUT per hospital since `since` → Map(hospitalId → Date). */
  lastTimeoutByHospital: async (hospitalIds, since) => {
    const rows = await HospitalRequest.aggregate([
      { $match: { hospitalId: { $in: hospitalIds }, status: OFFER_STATUS.TIMEOUT, respondedAt: { $gte: since } } },
      { $group: { _id: '$hospitalId', last: { $max: '$respondedAt' } } },
    ]);
    return new Map(rows.map((r) => [r._id.toString(), r.last]));
  },

  countByStatus: async () => {
    const rows = await HospitalRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  },

  averageResponseSeconds: async () => {
    const [row] = await HospitalRequest.aggregate([
      {
        $match: {
          status: { $in: [OFFER_STATUS.ACCEPTED, OFFER_STATUS.REJECTED] },
          respondedAt: { $ne: null },
          respondedBy: { $ne: null },
        },
      },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$respondedAt', '$offeredAt'] } } } },
    ]);
    return row ? row.avgMs / 1000 : null;
  },
};
