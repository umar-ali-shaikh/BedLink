import { EmergencyRequest } from '../models/index.js';

export const emergencyRepo = {
  create: (data) => EmergencyRequest.create(data),
  findById: (id, { session } = {}) => EmergencyRequest.findById(id).session(session ?? null),
  list: (filter = {}, { limit = 100 } = {}) =>
    EmergencyRequest.find(filter).sort({ createdAt: -1 }).limit(limit).select('-candidates -exclusions'),
  idsByDispatcher: async (dispatcherId) =>
    (await EmergencyRequest.find({ dispatcherId }).select('_id').lean()).map((e) => e._id),
  count: (filter = {}) => EmergencyRequest.countDocuments(filter),

  /**
   * Conditional state change (RULES.md §11): applies `set` only when the emergency is
   * in one of `fromStatuses` (and matches `extraFilter`). Returns the updated doc or null.
   */
  transition: (id, fromStatuses, set, { session, extraFilter = {}, push } = {}) => {
    const update = { $set: set };
    if (push) update.$addToSet = push;
    return EmergencyRequest.findOneAndUpdate(
      { _id: id, status: { $in: [].concat(fromStatuses) }, ...extraFilter },
      update,
      { returnDocument: 'after', session }
    );
  },

  /** Store a fresh ranking without changing status. */
  saveMatching: (id, { candidates, exclusions, matchingDurationMs }) =>
    EmergencyRequest.findByIdAndUpdate(
      id,
      { $set: { candidates, exclusions, ...(matchingDurationMs != null ? { matchingDurationMs } : {}) } },
      { returnDocument: 'after' }
    ),

  averageMatchingMs: async () => {
    const [row] = await EmergencyRequest.aggregate([
      { $match: { matchingDurationMs: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$matchingDurationMs' } } },
    ]);
    return row?.avg ?? null;
  },

  countByStatus: async () => {
    const rows = await EmergencyRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    return Object.fromEntries(rows.map((r) => [r._id, r.count]));
  },
};
