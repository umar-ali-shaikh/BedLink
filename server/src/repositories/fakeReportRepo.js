import { FakeReport } from '../models/index.js';

export const fakeReportRepo = {
  create: (data) => FakeReport.create(data),
  /** Newest first. */
  since: (phoneHash, since) => FakeReport.find({ phoneHash, reportedAt: { $gte: since } }).sort({ reportedAt: -1 }),
};
