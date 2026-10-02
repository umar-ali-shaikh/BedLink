import { EmergencyTimeline } from '../models/index.js';

export const timelineRepo = {
  /** Append one or more entries. Returns the created docs in order. */
  append: (entries, { session } = {}) => EmergencyTimeline.create([].concat(entries), { session, ordered: true }),
  listByEmergency: (emergencyId) => EmergencyTimeline.find({ emergencyId }).sort({ timestamp: 1, _id: 1 }),
};
