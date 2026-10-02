import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { Booking } from '../src/models/index.js';
import { bookingBody, phoneN } from './fixtures/bookingFixtures.js';
import { request, resetDb, startTestDb, stopTestDb } from './helpers/testServer.js';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(resetDb);

// Own file: the per-IP counter lives in memory for the whole process, so it starts at zero here.
describe('per-IP booking rate limit', () => {
  it('answers 429 RATE_LIMITED once an IP exceeds BOOKING_RATE_LIMIT_PER_IP_PER_HOUR, and creates nothing', async () => {
    env.BOOKING_RATE_LIMIT_PER_IP_PER_HOUR = 2;
    for (let i = 1; i <= 2; i += 1) {
      await request()
        .post('/api/bookings')
        .send(bookingBody({ phone: phoneN(i) }))
        .expect(201);
    }
    const blocked = await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: phoneN(3) }));
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false, code: 'RATE_LIMITED' });
    expect(await Booking.countDocuments()).toBe(2);
    // Reading and cancelling through a tracking link is not part of the creation limit.
    const view = await request().get('/api/bookings/track/not-a-token');
    expect(view.status).toBe(404);
    env.BOOKING_RATE_LIMIT_PER_IP_PER_HOUR = 1000;
  });
});
