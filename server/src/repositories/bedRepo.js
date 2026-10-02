import mongoose from 'mongoose';
import { Bed } from '../models/index.js';
import { BED_STATUS, SUMMARY_RESOURCES } from '../constants/bed.js';

const asObjectId = (id) => new mongoose.Types.ObjectId(String(id));

/** `$group` accumulators for the five dashboard counters (available beds only). */
function summaryAccumulators() {
  const acc = {};
  for (const [key, { field, value }] of Object.entries(SUMMARY_RESOURCES)) {
    const matches = field === 'type' ? { $eq: ['$type', value] } : { $in: [value, '$equipment'] };
    acc[key] = {
      $sum: { $cond: [{ $and: [{ $eq: ['$status', BED_STATUS.AVAILABLE] }, matches] }, 1, 0] },
    };
  }
  for (const status of Object.values(BED_STATUS)) {
    acc[`status_${status}`] = { $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } };
  }
  acc.total = { $sum: 1 };
  acc.lastUpdatedAt = { $max: '$updatedAt' };
  return acc;
}

export const bedRepo = {
  findById: (id, { session } = {}) => Bed.findById(id).session(session ?? null),
  listByHospital: (hospitalId) => Bed.find({ hospitalId }).sort({ type: 1, label: 1 }),
  create: (data) => Bed.create(data),
  insertMany: (docs) => Bed.insertMany(docs),

  /** Beds of one type across many hospitals (matching input). Lean. */
  findByHospitalsAndType: (hospitalIds, type) =>
    Bed.find({ hospitalId: { $in: hospitalIds }, type })
      .select('hospitalId label type equipment status updatedAt')
      .lean(),

  /** Staff status change; refuses to touch RESERVED beds. Null if not found or reserved. */
  setStaffStatus: (id, status, userId) =>
    Bed.findOneAndUpdate(
      { _id: id, status: { $ne: BED_STATUS.RESERVED } },
      { $set: { status, lastUpdatedBy: userId } },
      { returnDocument: 'after' }
    ),

  /** "Confirm all": bump updatedAt of every non-reserved bed without changing status. */
  confirmAll: (hospitalId, userId) =>
    Bed.updateMany({ hospitalId, status: { $ne: BED_STATUS.RESERVED } }, { $set: { lastUpdatedBy: userId } }),

  /**
   * Atomic lock (ARCHITECTURE.md §13.1). Only one concurrent caller can see a given bed
   * as AVAILABLE; the others get null.
   */
  lockMatchingBed: ({ hospitalId, bedType, equipment, bedId, userId }, { session } = {}) => {
    const filter = { hospitalId, status: BED_STATUS.AVAILABLE };
    if (bedId) filter._id = bedId;
    if (bedType) filter.type = bedType;
    if (equipment?.length) filter.equipment = { $all: equipment };
    return Bed.findOneAndUpdate(
      filter,
      { $set: { status: BED_STATUS.RESERVED, lastUpdatedBy: userId } },
      { returnDocument: 'after', sort: { updatedAt: -1 }, session }
    );
  },

  /** Conditional transition used by the reservation service (RESERVED → X). */
  transition: (id, from, to, userId = null, { session } = {}) =>
    Bed.findOneAndUpdate(
      { _id: id, status: from },
      { $set: { status: to, ...(userId ? { lastUpdatedBy: userId } : {}) } },
      { returnDocument: 'after', session }
    ),

  /** Counters + status totals per hospital. Returns Map(hospitalId → raw summary). */
  summarize: async (hospitalIds) => {
    const match = hospitalIds ? { hospitalId: { $in: hospitalIds.map(asObjectId) } } : {};
    const rows = await Bed.aggregate([{ $match: match }, { $group: { _id: '$hospitalId', ...summaryAccumulators() } }]);
    return new Map(rows.map((r) => [r._id.toString(), r]));
  },

  countAvailable: (filter = {}) => Bed.countDocuments({ status: BED_STATUS.AVAILABLE, ...filter }),
};
