import mongoose from 'mongoose';
import { jsonOptions } from './plugins/toJSON.js';

const { ObjectId } = mongoose.Schema.Types;
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

/** Persisted copy of a user-facing alert so reconnecting clients can catch up. */
const notificationSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, ref: 'User', default: null },
    hospitalId: { type: ObjectId, ref: 'Hospital', default: null },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    refId: { type: ObjectId, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: jsonOptions() }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ hospitalId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: SEVEN_DAYS_SECONDS });

export const Notification = mongoose.model('Notification', notificationSchema);
