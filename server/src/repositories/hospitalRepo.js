import mongoose from 'mongoose';
import { Hospital } from '../models/index.js';
import { HOSPITAL_STATUS, UNVERIFIED_STATUSES } from '../constants/hospital.js';
import { toPoint } from '../utils/geo.js';

export const hospitalRepo = {
  findById: (id, { session } = {}) => Hospital.findById(id).session(session ?? null),
  exists: (id) => Hospital.exists({ _id: id }),
  list: (filter = {}) => Hospital.find(filter).sort({ name: 1 }),
  create: (data) => Hospital.create(data),
  deleteById: (id) => Hospital.deleteOne({ _id: id }),
  findOne: (filter) => Hospital.findOne(filter),
  existsBy: (filter) => Hospital.exists(filter),
  /** Same-named hospital (case-insensitive) within `meters` of `point`. */
  findNamedNear: ({ name, point, meters }) =>
    Hospital.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      location: { $nearSphere: { $geometry: toPoint(point), $maxDistance: meters } },
    }),
  updateById: (id, update) => Hospital.findByIdAndUpdate(id, update, { returnDocument: 'after', runValidators: true }),

  /** Turn a lean aggregate row back into a document (for toJSON). */
  hydrate: (raw) => Hospital.hydrate(raw),

  touchAvailability: (id, at = new Date(), { session } = {}) =>
    Hospital.updateOne({ _id: id }, { $max: { lastAvailabilityUpdate: at } }, { session }),

  /**
   * Hospitals within `radiusKm` of `point`, nearest first, with `distanceMeters`.
   * Returns lean docs. `onlyIds` narrows the result (used to re-validate one hospital).
   */
  findNear: ({ point, radiusKm, onlyIds, activeOnly = false }) => {
    // Unverified (self-registered, not yet checked) hospitals never take part in matching.
    const query = { verificationStatus: { $nin: [...UNVERIFIED_STATUSES] } };
    if (onlyIds?.length) query._id = { $in: onlyIds.map((id) => new mongoose.Types.ObjectId(String(id))) };
    if (activeOnly) query.status = HOSPITAL_STATUS.ACTIVE;
    return Hospital.aggregate([
      {
        $geoNear: {
          near: toPoint(point),
          distanceField: 'distanceMeters',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query,
        },
      },
    ]);
  },
};
