import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { EmergencyRequest, HospitalRequest } from '../src/models/index.js';
import { expireOffer } from '../src/services/emergency/index.js';
import { sweepOnce } from '../src/services/sweeper.js';
import {
  ICU_VENT_CARDIO,
  PATIENT,
  loginAs,
  resetDb,
  sleep,
  startTestDb,
  stopTestDb,
  waitFor,
} from './helpers/testServer.js';

let seed;
let dispatcher;
beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  seed = await resetDb();
  dispatcher = await loginAs('dispatcher1@bedlink.demo');
});
afterEach(() => {
  env.OFFER_TIMEOUT_SECONDS = 120;
});

const hospitalId = (slug) => seed.hospitals[slug]._id.toString();

async function createEmergency(body = ICU_VENT_CARDIO) {
  const res = await dispatcher.post('/api/emergencies').send(body);
  expect(res.status).toBe(201);
  return res.body.data;
}

const pendingOfferFor = (emergencyId) => HospitalRequest.findOne({ emergencyId, status: 'PENDING' });

describe('create emergency', () => {
  it('stores a demo patient id, ranked candidates and exclusions', async () => {
    const e = await createEmergency();
    expect(e.demoPatientId).toMatch(/^DEMO-P-\d{4}$/);
    expect(e.status).toBe('SEARCHING');
    expect(e.patientLocation).toEqual(PATIENT);
    expect(e.candidates.map((c) => c.hospitalName)).toEqual([
      'Lakeside Medical Centre',
      'City General Hospital',
      'Greenfield Care Hospital',
      'Eastwood Medical',
    ]);
    expect(e.candidates[0]).toMatchObject({ rank: 1, score: 91, confidence: 'HIGH', etaMinutes: 8 });
    const reasons = Object.fromEntries(e.exclusions.map((x) => [x.hospitalName, x.reasons]));
    expect(reasons).toMatchObject({
      'Sunrise Hospital': ['MISSING_EQUIPMENT'],
      'St. Aurora Heart Institute': ['CRITICAL_LOAD'],
      'Westbay Community Hospital': ['NO_MATCHING_BED'],
      'Harbourview Hospital': ['MISSING_SPECIALTY'],
      'Northgate Hospital': ['HOSPITAL_INACTIVE'],
      'Far Coast Hospital': ['OUT_OF_RANGE'],
    });
    expect(e.matchingDurationMs).toBeLessThan(1000);

    const full = (await dispatcher.get(`/api/emergencies/${e.id}`)).body.data;
    expect(full.timeline.map((t) => t.event)).toEqual(['REQUEST_CREATED', 'MATCHING_COMPLETED']);
  });

  it('has no PII fields and rejects them', async () => {
    const res = await dispatcher.post('/api/emergencies').send({ ...ICU_VENT_CARDIO, patientName: 'Jane Doe' });
    expect(res.status).toBe(400);
    expect(Object.keys(EmergencyRequest.schema.paths).some((p) => /name|phone|aadhaar|address/i.test(p))).toBe(false);
  });

  it('rejects invalid coordinates and unknown enums with field details', async () => {
    const res = await dispatcher.post('/api/emergencies').send({
      patientLocation: { lat: 91, lng: 72 },
      requirements: { bedType: 'SPACESHIP', equipment: ['LASER'] },
    });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.path)).toEqual(
      expect.arrayContaining(['body.patientLocation.lat', 'body.requirements.bedType', 'body.requirements.equipment.0'])
    );
  });

  it('returns NO_MATCH (200) when nothing fits', async () => {
    const e = await createEmergency({
      patientLocation: PATIENT,
      requirements: { bedType: 'BURNS', specialties: ['NEUROLOGY'] },
    });
    expect(e.status).toBe('NO_MATCH');
  });

  it('dispatchers only see their own emergencies; hospitals and other roles are scoped', async () => {
    const e = await createEmergency();
    const other = await loginAs('dispatcher2@bedlink.demo');
    expect((await other.get(`/api/emergencies/${e.id}`)).status).toBe(403);
    expect((await other.get('/api/emergencies')).body.data).toHaveLength(0);
    expect((await dispatcher.get('/api/emergencies?status=SEARCHING,NO_MATCH')).body.data).toHaveLength(1);

    const hospital = await loginAs('lakeside@bedlink.demo');
    expect((await hospital.get(`/api/emergencies/${e.id}`)).status).toBe(403);
    expect((await hospital.post('/api/emergencies').send(ICU_VENT_CARDIO)).status).toBe(403);

    const admin = await loginAs('admin@bedlink.demo');
    expect((await admin.get(`/api/emergencies/${e.id}`)).status).toBe(200);
  });
});

describe('2-minute handshake', () => {
  it('request-hospital creates one PENDING offer to the top candidate; a second request → 409', async () => {
    const e = await createEmergency();
    const res = await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('AWAITING_HOSPITAL');
    expect(res.body.data.currentHospital).toBe(hospitalId('lakeside'));

    const offer = await pendingOfferFor(e.id);
    expect(offer.expiresAt - offer.offeredAt).toBe(120_000);

    const again = await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('OFFER_ALREADY_PENDING');
    expect(await HospitalRequest.countDocuments({ emergencyId: e.id, status: 'PENDING' })).toBe(1);
  });

  it('manual pick is re-validated; a non-matching hospital → 409 HOSPITAL_NO_LONGER_MATCHES', async () => {
    const e = await createEmergency();
    const bad = await dispatcher
      .post(`/api/emergencies/${e.id}/request-hospital`)
      .send({ hospitalId: hospitalId('sunrise') });
    expect(bad.status).toBe(409);
    expect(bad.body.code).toBe('HOSPITAL_NO_LONGER_MATCHES');

    const good = await dispatcher
      .post(`/api/emergencies/${e.id}/request-hospital`)
      .send({ hospitalId: hospitalId('citygeneral') });
    expect(good.status).toBe(200);
    expect(good.body.data.currentHospital).toBe(hospitalId('citygeneral'));
  });

  it('the hospital sees the offer in its queue; other hospitals cannot answer it', async () => {
    const e = await createEmergency();
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const lakeside = await loginAs('lakeside@bedlink.demo');
    const queue = (await lakeside.get('/api/hospital-requests?status=PENDING')).body.data;
    expect(queue.requests).toHaveLength(1);
    expect(queue.requests[0].emergency).toMatchObject({ urgency: 'CRITICAL', requirements: { bedType: 'ICU' } });
    expect(queue.serverNow).toBeTruthy();

    const view = (await lakeside.get(`/api/emergencies/${e.id}`)).body.data;
    expect(view).toMatchObject({ urgency: 'CRITICAL', etaMinutes: 8 });
    expect(view.dispatcherId).toBeUndefined();
    expect(view.patientLocation).toBeUndefined();

    const city = await loginAs('citygeneral@bedlink.demo');
    const res = await city.post(`/api/hospital-requests/${queue.requests[0].id}/accept`);
    expect(res.status).toBe(403);
  });

  it('reject → automatic fallback to the next hospital; the first never gets it again', async () => {
    const e = await createEmergency();
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const first = await pendingOfferFor(e.id);
    const lakeside = await loginAs('lakeside@bedlink.demo');

    const res = await lakeside.post(`/api/hospital-requests/${first.id}/reject`).send({ reason: 'NO_STAFF' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'REJECTED', rejectReason: 'NO_STAFF' });

    const next = await pendingOfferFor(e.id);
    expect(next.hospitalId.toString()).toBe(hospitalId('citygeneral'));
    expect(next.attempt).toBe(2);

    const full = (await dispatcher.get(`/api/emergencies/${e.id}`)).body.data;
    expect(full.status).toBe('AWAITING_HOSPITAL');
    expect(full.timeline.map((t) => [t.event, t.actor.type])).toEqual([
      ['REQUEST_CREATED', 'USER'],
      ['MATCHING_COMPLETED', 'SYSTEM'],
      ['HOSPITAL_CONTACTED', 'USER'],
      ['HOSPITAL_REJECTED', 'USER'],
      ['HOSPITAL_CONTACTED', 'SYSTEM'],
    ]);
    expect(full.exclusions.find((x) => x.hospitalName === 'Lakeside Medical Centre').reasons).toEqual([
      'ALREADY_CONTACTED',
    ]);

    const again = await lakeside.post(`/api/hospital-requests/${first.id}/reject`).send({ reason: 'NO_STAFF' });
    expect(again.body.code).toBe('OFFER_ALREADY_RESOLVED');
  });

  it('reject needs a valid staff reason', async () => {
    const e = await createEmergency();
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const offer = await pendingOfferFor(e.id);
    const lakeside = await loginAs('lakeside@bedlink.demo');
    expect((await lakeside.post(`/api/hospital-requests/${offer.id}/reject`).send({})).status).toBe(400);
    expect(
      (await lakeside.post(`/api/hospital-requests/${offer.id}/reject`).send({ reason: 'NO_BED_AT_ACCEPT' })).status
    ).toBe(400);
  });

  it('server-side timeout (in-process timer) → TIMEOUT by SYSTEM → fallback; accept after expiry → 409', async () => {
    env.OFFER_TIMEOUT_SECONDS = 1;
    const e = await createEmergency();
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const first = await pendingOfferFor(e.id);

    const timedOut = await waitFor(async () => {
      const o = await HospitalRequest.findById(first.id);
      return o.status === 'TIMEOUT' && o;
    });
    expect(timedOut.respondedAt).toBeTruthy();

    const lakeside = await loginAs('lakeside@bedlink.demo');
    const late = await lakeside.post(`/api/hospital-requests/${first.id}/accept`);
    expect(late.status).toBe(409);
    expect(late.body.code).toBe('OFFER_EXPIRED');

    const next = await waitFor(() => pendingOfferFor(e.id));
    expect(next.hospitalId.toString()).toBe(hospitalId('citygeneral'));
    const full = (await dispatcher.get(`/api/emergencies/${e.id}`)).body.data;
    const timeout = full.timeline.find((t) => t.event === 'HOSPITAL_TIMEOUT');
    expect(timeout.actor.type).toBe('SYSTEM');
  });

  it('sweeper times out overdue offers even without a timer (restart recovery)', async () => {
    const e = await createEmergency();
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const offer = await pendingOfferFor(e.id);
    const result = await sweepOnce(new Date(offer.expiresAt.getTime() + 1000));
    expect(result.offers).toBe(1);
    expect((await HospitalRequest.findById(offer.id)).status).toBe('TIMEOUT');
    // Expiring the same offer again is a no-op (idempotent: timer + sweeper may both fire).
    expect(await expireOffer(offer.id, new Date(offer.expiresAt.getTime() + 2000))).toBeNull();
    // Fallback already offered the next hospital.
    expect((await pendingOfferFor(e.id)).hospitalId.toString()).toBe(hospitalId('citygeneral'));
  });

  it('accepting just before expiry wins; nothing changes after', async () => {
    env.OFFER_TIMEOUT_SECONDS = 2;
    const e = await createEmergency();
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const offer = await pendingOfferFor(e.id);
    const lakeside = await loginAs('lakeside@bedlink.demo');
    const res = await lakeside.post(`/api/hospital-requests/${offer.id}/accept`);
    expect(res.status).toBe(200);
    await sleep(2200);
    expect((await HospitalRequest.findById(offer.id)).status).toBe('ACCEPTED');
  });

  it('exhausting every candidate ends in NO_MATCH; retry starts a new round', async () => {
    // BURNS + BURNS specialty: only Riverside qualifies (Far Coast is out of range).
    const e = await createEmergency({
      patientLocation: PATIENT,
      requirements: { bedType: 'BURNS', specialties: ['BURNS'] },
    });
    expect(e.candidates.map((c) => c.hospitalName)).toEqual(['Riverside Burns & Trauma Centre']);
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const offer = await pendingOfferFor(e.id);
    const riverside = await loginAs('riverside@bedlink.demo');
    await riverside.post(`/api/hospital-requests/${offer.id}/reject`).send({ reason: 'NO_BED' });

    const full = (await dispatcher.get(`/api/emergencies/${e.id}`)).body.data;
    expect(full.status).toBe('NO_MATCH');
    expect(full.timeline.at(-1)).toMatchObject({ event: 'NO_HOSPITALS_REMAINING', actor: { type: 'SYSTEM' } });

    const retry = await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    expect(retry.status).toBe(200);
    expect(retry.body.data.status).toBe('AWAITING_HOSPITAL');
  });
});

describe('cancel', () => {
  it('cancelling while pending withdraws the offer', async () => {
    const e = await createEmergency();
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const offer = await pendingOfferFor(e.id);
    const res = await dispatcher.post(`/api/emergencies/${e.id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
    expect((await HospitalRequest.findById(offer.id)).status).toBe('CANCELLED');

    const lakeside = await loginAs('lakeside@bedlink.demo');
    expect((await lakeside.post(`/api/hospital-requests/${offer.id}/accept`)).body.code).toBe('OFFER_ALREADY_RESOLVED');
    expect((await dispatcher.post(`/api/emergencies/${e.id}/cancel`)).body.code).toBe('INVALID_STATE_TRANSITION');
    expect((await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`)).body.code).toBe(
      'INVALID_STATE_TRANSITION'
    );
  });

  it('another dispatcher cannot cancel', async () => {
    const e = await createEmergency();
    const other = await loginAs('dispatcher2@bedlink.demo');
    expect((await other.post(`/api/emergencies/${e.id}/cancel`)).status).toBe(403);
  });
});
