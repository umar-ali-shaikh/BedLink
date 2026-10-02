import { createHmac } from 'node:crypto';
import { env } from '../../config/env.js';
import { fakeReportRepo } from '../../repositories/fakeReportRepo.js';
import { AppError } from '../../utils/AppError.js';

const DAY_MS = 24 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;

/** The number is never stored in the clear here; an HMAC is enough to count reports against it. */
const phoneHash = (phone) => createHmac('sha256', env.JWT_SECRET).update(`fake-report:${phone}`).digest('hex');

export function recordFakeReport(booking, now = new Date()) {
  return fakeReportRepo.create({ phoneHash: phoneHash(booking.phone), bookingId: booking._id, reportedAt: now });
}

/**
 * Refuse new bookings from a number that was reported as fake/prank FAKE_REPORT_BLOCK_THRESHOLD
 * times within FAKE_REPORT_WINDOW_DAYS, for FAKE_REPORT_BLOCK_HOURS after the latest report.
 */
export async function assertPhoneNotBlocked(phone, now = new Date()) {
  const reports = await fakeReportRepo.since(
    phoneHash(phone),
    new Date(now.getTime() - env.FAKE_REPORT_WINDOW_DAYS * DAY_MS)
  );
  if (reports.length < env.FAKE_REPORT_BLOCK_THRESHOLD) return;
  const until = new Date(reports[0].reportedAt.getTime() + env.FAKE_REPORT_BLOCK_HOURS * HOUR_MS);
  if (until <= now) return;
  const hours = Math.max(1, Math.ceil((until - now) / HOUR_MS));
  const message = `Bookings from this number are paused because ambulance crews reported ${reports.length} false requests. You can book again in about ${hours} hour${hours === 1 ? '' : 's'}. In a real emergency call 112.`;
  throw new AppError('PHONE_BLOCKED', message, undefined, [{ path: 'phone', message }]);
}
