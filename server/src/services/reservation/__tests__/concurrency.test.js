import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../../config/env.js';
import { Bed, HospitalRequest, Reservation } from '../../../models/index.js';
import { ICU_VENT_CARDIO, loginAs, resetDb, startTestDb, stopTestDb } from '../../../../tests/helpers/testServer.js';

/**
 * ARCHITECTURE.md §13.5: two accepts race for a hospital's only matching bed.
 * Exactly one 200, one 409 BED_NOT_AVAILABLE, exactly one ACTIVE reservation.
 * Runs with transactions and with the compensation fallback.
 */
let seed;
beforeAll(startTestDb);
afterAll(async () => {
  env.MONGO_TRANSACTIONS = true;
  await stopTestDb();
});

describe.each([
  ['with transactions', true],
  ['without transactions (compensation)', false],
])('double accept on the last bed %s', (_label, transactions) => {
  beforeEach(async () => {
    env.MONGO_TRANSACTIONS = transactions;
    seed = await resetDb();
  });

  it('exactly one accept wins', async () => {
    // Eastwood Medical has exactly one AVAILABLE ICU bed with a ventilator.
    const eastwoodId = seed.hospitals.eastwood._id;
    expect(
      await Bed.countDocuments({ hospitalId: eastwoodId, type: 'ICU', status: 'AVAILABLE', equipment: 'VENTILATOR' })
    ).toBe(1);

    const offers = [];
    for (const email of ['dispatcher1@bedlink.demo', 'dispatcher2@bedlink.demo']) {
      const dispatcher = await loginAs(email);
      const e = (await dispatcher.post('/api/emergencies').send(ICU_VENT_CARDIO)).body.data;
      const res = await dispatcher
        .post(`/api/emergencies/${e.id}/request-hospital`)
        .send({ hospitalId: eastwoodId.toString() });
      expect(res.status).toBe(200);
      offers.push(await HospitalRequest.findOne({ emergencyId: e.id, status: 'PENDING' }));
    }

    const staff = await loginAs('eastwood@bedlink.demo');
    const results = await Promise.all(offers.map((o) => staff.post(`/api/hospital-requests/${o.id}/accept`)));

    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    const loser = results.find((r) => r.status === 409);
    expect(loser.body.code).toBe('BED_NOT_AVAILABLE');

    expect(await Reservation.countDocuments({ hospitalId: eastwoodId, status: 'ACTIVE' })).toBe(1);
    expect(await Bed.countDocuments({ hospitalId: eastwoodId, status: 'RESERVED' })).toBe(1);

    // The losing offer is treated as a rejection and fallback moved that emergency on.
    const loserOffer = offers[results.indexOf(loser)];
    const after = await HospitalRequest.findById(loserOffer.id);
    expect(after).toMatchObject({ status: 'REJECTED', rejectReason: 'NO_BED_AT_ACCEPT' });
    const next = await HospitalRequest.findOne({ emergencyId: loserOffer.emergencyId, status: 'PENDING' });
    expect(next.hospitalId.toString()).not.toBe(eastwoodId.toString());
  });

  it('two admin manual holds on the same bed: one 201, one 409', async () => {
    const admin = await loginAs('admin@bedlink.demo');
    const dispatcher = await loginAs('dispatcher1@bedlink.demo');
    const e1 = (await dispatcher.post('/api/emergencies').send(ICU_VENT_CARDIO)).body.data;
    const e2 = (await dispatcher.post('/api/emergencies').send(ICU_VENT_CARDIO)).body.data;
    const bed = await Bed.findOne({ hospitalId: seed.hospitals.lakeside._id, type: 'ICU', status: 'AVAILABLE' });

    const results = await Promise.all(
      [e1, e2].map((e) => admin.post('/api/reservations').send({ requestId: e.id, bedId: bed.id }))
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await Reservation.countDocuments({ bedId: bed._id, status: 'ACTIVE' })).toBe(1);
  });
});
