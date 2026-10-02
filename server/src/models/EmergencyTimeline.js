import mongoose from 'mongoose';
import { ROLE_VALUES } from '../constants/roles.js';
import { ACTOR_TYPES, TIMELINE_EVENT_VALUES } from '../constants/emergency.js';
import { jsonOptions } from './plugins/toJSON.js';

const { ObjectId } = mongoose.Schema.Types;

/** Append-only; doubles as the emergency audit log (ARCHITECTURE.md §6.7). */
const timelineSchema = new mongoose.Schema(
  {
    emergencyId: { type: ObjectId, ref: 'EmergencyRequest', required: true, index: true },
    event: { type: String, enum: TIMELINE_EVENT_VALUES, required: true },
    actor: {
      type: { type: String, enum: Object.values(ACTOR_TYPES), required: true },
      userId: { type: ObjectId, ref: 'User', default: null },
      role: { type: String, enum: [...ROLE_VALUES, null], default: null },
    },
    hospitalId: { type: ObjectId, ref: 'Hospital', default: null },
    timestamp: { type: Date, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, toJSON: jsonOptions() }
);

timelineSchema.index({ emergencyId: 1, timestamp: 1 });

export const EmergencyTimeline = mongoose.model('EmergencyTimeline', timelineSchema);
