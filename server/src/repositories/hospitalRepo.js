import mongoose from 'mongoose';
import { Hospital } from '../models/index.js';
import { HOSPITAL_STATUS } from '../constants/hospital.js';
import { toPoint } from '../utils/geo.js';

export const hospitalRepo = {
  findById: (id, { session } = {}) => Hospital.findById(id).session(session ?? null),
  exists: (id) => Hospital.exists({ _id: id }),
  list: (filter = {}) => Hospital.find(filter).sort({ name: 1 }),
  create: (data) => Hospital.create(data),
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
    const query = {};
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
