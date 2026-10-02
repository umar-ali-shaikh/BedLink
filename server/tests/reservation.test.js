import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Bed, EmergencyRequest, HospitalRequest, Reservation } from '../src/models/index.js';
import { sweepOnce } from '../src/services/sweeper.js';
import { ICU_VENT_CARDIO, loginAs, resetDb, startTestDb, stopTestDb } from './helpers/testServer.js';

let dispatcher;
let lakeside;
beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  await resetDb();
  dispatcher = await loginAs('dispatcher1@bedlink.demo');
  lakeside = await loginAs('lakeside@bedlink.demo');
});

/** Create → request top hospital (Lakeside) → Lakeside accepts. */
async function reservedEmergency() {
  const e = (await dispatcher.post('/api/emergencies').send(ICU_VENT_CARDIO)).body.data;
  await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
  const offer = await HospitalRequest.findOne({ emergencyId: e.id, status: 'PENDING' });
  const res = await lakeside.post(`/api/hospital-requests/${offer.id}/accept`);
  expect(res.status).toBe(200);
  return { emergency: e, offer, reservation: res.body.data.reservation };
}

describe('reservation lifecycle', () => {
  it('accept locks exactly one matching bed with a 30-minute hold', async () => {
    const { emergency, reservation } = await reservedEmergency();
    const bed = await Bed.findById(reservation.bedId);
    expect(bed.status).toBe('RESERVED');
    expect(bed.type).toBe('ICU');
    expect(bed.equipment).toContain('VENTILATOR');
    expect(new Date(reservation.expiresAt) - new Date(reservation.createdAt)).toBeCloseTo(30 * 60_000, -3);

    const full = (await dispatcher.get(`/api/emergencies/${emergency.id}`)).body.data;
    expect(full.status).toBe('RESERVED');
    expect(full.reservation.bed.label).toBe(bed.label);
    expect(full.timeline.slice(-2).map((t) => t.event)).toEqual(['HOSPITAL_ACCEPTED', 'BED_RESERVED']);

    const staffView = (await lakeside.get('/api/hospital-requests?status=ACCEPTED')).body.data.requests[0];
    expect(staffView.reservation.bed.label).toBe(bed.label);
  });

  it('staff cannot change the reserved bed from the bed grid', async () => {
    const { reservation } = await reservedEmergency();
    const res = await lakeside.patch(`/api/beds/${reservation.bedId}`).send({ status: 'AVAILABLE' });
    expect(res.body.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('mark arrived → bed OCCUPIED, reservation FULFILLED, emergency COMPLETED', async () => {
    const { emergency, reservation } = await reservedEmergency();
    const city = await loginAs('citygeneral@bedlink.demo');
    expect((await city.post(`/api/reservations/${reservation.id}/arrive`)).status).toBe(403);

    const res = await lakeside.post(`/api/reservations/${reservation.id}/arrive`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FULFILLED');
    expect((await Bed.findById(reservation.bedId)).status).toBe('OCCUPIED');
    expect((await EmergencyRequest.findById(emergency.id)).status).toBe('COMPLETED');
    expect((await lakeside.post(`/api/reservations/${reservation.id}/arrive`)).body.code).toBe(
      'INVALID_STATE_TRANSITION'
    );
  });

  it('hold expiry (sweeper) frees the bed and returns the emergency to SEARCHING; dispatcher can retry', async () => {
    const { emergency, reservation } = await reservedEmergency();
    const later = new Date(new Date(reservation.expiresAt).getTime() + 1000);
    const result = await sweepOnce(later);
    expect(result.reservations).toBe(1);

    expect((await Reservation.findById(reservation.id)).status).toBe('EXPIRED');
    expect((await Bed.findById(reservation.bedId)).status).toBe('AVAILABLE');
    const e = await EmergencyRequest.findById(emergency.id);
    expect(e.status).toBe('SEARCHING');
    expect(e.reservationId).toBeNull();

    const arrive = await lakeside.post(`/api/reservations/${reservation.id}/arrive`);
    expect(arrive.body.code).toBe('RESERVATION_EXPIRED');

    const retry = await dispatcher.post(`/api/emergencies/${emergency.id}/request-hospital`);
    expect(retry.status).toBe(200);
    expect(retry.body.data.status).toBe('AWAITING_HOSPITAL');
  });

  it('dispatcher (owner) can release; another dispatcher cannot', async () => {
    const { emergency, reservation } = await reservedEmergency();
    const other = await loginAs('dispatcher2@bedlink.demo');
    expect((await other.post(`/api/reservations/${reservation.id}/release`)).status).toBe(403);

    const res = await dispatcher.post(`/api/reservations/${reservation.id}/release`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('RELEASED');
    expect((await Bed.findById(reservation.bedId)).status).toBe('AVAILABLE');
    const full = (await dispatcher.get(`/api/emergencies/${emergency.id}`)).body.data;
    expect(full.status).toBe('SEARCHING');
    expect(full.timeline.at(-1).event).toBe('RESERVATION_RELEASED');
  });

  it('cancelling a RESERVED emergency releases its bed', async () => {
    const { emergency, reservation } = await reservedEmergency();
    const res = await dispatcher.post(`/api/emergencies/${emergency.id}/cancel`);
    expect(res.status).toBe(200);
    expect((await Reservation.findById(reservation.id)).status).toBe('RELEASED');
    expect((await Bed.findById(reservation.bedId)).status).toBe('AVAILABLE');
    expect((await EmergencyRequest.findById(emergency.id)).status).toBe('CANCELLED');
  });

  it('lists reservations scoped by role', async () => {
    await reservedEmergency();
    expect((await lakeside.get('/api/reservations')).body.data).toHaveLength(1);
    expect((await dispatcher.get('/api/reservations?status=ACTIVE')).body.data[0].bed.label).toBeTruthy();
    const other = await loginAs('dispatcher2@bedlink.demo');
    expect((await other.get('/api/reservations')).body.data).toHaveLength(0);
    const city = await loginAs('citygeneral@bedlink.demo');
    expect((await city.get('/api/reservations')).body.data).toHaveLength(0);
  });
});

describe('analytics', () => {
  it('counts match the scripted run', async () => {
    const { emergency } = await reservedEmergency();
    const second = (await dispatcher.post('/api/emergencies').send(ICU_VENT_CARDIO)).body.data;
    await dispatcher.post(`/api/emergencies/${second.id}/request-hospital`);
    const offer = await HospitalRequest.findOne({ emergencyId: second.id, status: 'PENDING' });
    await lakeside.post(`/api/hospital-requests/${offer.id}/reject`).send({ reason: 'NO_BED' });

    const admin = await loginAs('admin@bedlink.demo');
    const res = await admin.get('/api/analytics/overview');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalEmergencies: 2,
      emergenciesByStatus: { RESERVED: 1, AWAITING_HOSPITAL: 1 },
      offers: { accepted: 1, rejected: 1, timedOut: 0, pending: 1 },
      activeReservations: 1,
    });
    expect(res.body.data.avgMatchingMs).toBeGreaterThanOrEqual(0);
    expect(res.body.data.avgResponseSeconds).toBeGreaterThanOrEqual(0);
    expect(emergency.id).toBeTruthy();

    const hospital = await loginAs('lakeside@bedlink.demo');
    expect((await hospital.get('/api/analytics/overview')).status).toBe(403);
  });
});
