import { fromPoint } from '../../utils/geo.js';

/**
 * Shared JSON shape: `_id` → `id`, no `__v`, never `passwordHash`, and GeoJSON points
 * exposed as `{ lat, lng }` under the names in `pointFields` (ARCHITECTURE.md §6.2).
 *
 * @param {Record<string, string>} pointFields map of stored field → API field
 */
export function jsonOptions(pointFields = {}) {
  return {
    virtuals: false,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.passwordHash;
      for (const [stored, exposed] of Object.entries(pointFields)) {
        if (stored in ret) {
          const point = fromPoint(ret[stored]);
          delete ret[stored];
          ret[exposed] = point;
        }
      }
      return ret;
    },
  };
}
