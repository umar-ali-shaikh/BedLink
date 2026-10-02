import mongoose from 'mongoose';
import { env } from '../config/env.js';

/**
 * One "fake or prank" report against a caller's phone number. The number is stored only as an
 * HMAC, and the document expires from the database after FAKE_REPORT_WINDOW_DAYS (TTL index).
 */
const fakeReportSchema = new mongoose.Schema(
  {
    phoneHash: { type: String, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    reportedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

fakeReportSchema.index({ phoneHash: 1, reportedAt: -1 });
fakeReportSchema.index(
  { reportedAt: 1 },
  { expireAfterSeconds: env.FAKE_REPORT_WINDOW_DAYS * 24 * 60 * 60, name: 'fake_report_ttl' }
);

export const FakeReport = mongoose.model('FakeReport', fakeReportSchema);
