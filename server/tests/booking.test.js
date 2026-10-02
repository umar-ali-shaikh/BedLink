import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { CONDITION_REQUIREMENTS, CONDITION_VALUES } from '../src/constants/booking.js';
import { AmbulanceOffer, Bed, Booking, EmergencyRequest, HospitalRequest, Reservation } from '../src/models/index.js';
import {
  acceptBookingOffer,
  purgeBookingPersonalData,
  updateAmbulanceLocation,
} from '../src/services/booking/index.js';
import { onEmit } from '../src/services/notification/index.js';
import { sweepOnce } from '../src/services/sweeper.js';
import { fromPoint } from '../src/utils/geo.js';
import { PICKUP, bookingBody, createAmbulance, phoneN } from './fixtures/bookingFixtures.js';
import { loginAs, request, resetDb, startTestDb, stopTestDb } from './helpers/testServer.js';

let seed;
let phoneCounter = 0;
const nextPhone = () => phoneN(++phoneCounter);

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  seed = await resetDb();
});
afterEach(() => {
  env.BOOKING_RATE_LIMIT_PER_PHONE_PER_HOUR = 100;
  env.BOOKING_OFFER_TIMEOUT_SECONDS = 60;
  env.AMBULANCE_LOCATION_MAX_AGE_SECONDS = 120;
});

// Ambulances at 1.1 km, 3.3 km and 6.7 km north of the pickup (each ≈ 0.01° of latitude per 1.1 km).
const NEAR = { lat: PICKUP.lat + 0.01, lng: PICKUP.lng };
const MID = { lat: PICKUP.lat + 0.03, lng: PICKUP.lng };
const FAR = { lat: PICKUP.lat + 0.06, lng: PICKUP.lng };

async function book(overrides = {}) {
  const res = await request()
    .post('/api/bookings')
    .send(bookingBody({ phone: nextPhone(), ...overrides }));
  expect(res.status).toBe(201);
  const doc = await Booking.findOne().sort({ createdAt: -1 });
  return { token: res.body.data.token, view: res.body.data.booking, booking: doc };
}

const pendingOffer = (bookingId) => AmbulanceOffer.findOne({ bookingId, status: 'PENDING' });
const track = (token) => request().get(`/api/bookings/track/${token}`);
const slugOf = (hospitalId) =>
  Object.entries(seed.hospitals).find(([, h]) => h._id.toString() === hospitalId.toString())[0];
const hospitalStaff = (hospitalId) => loginAs(`${slugOf(hospitalId)}@bedlink.demo`);

/** Book → the nearest ambulance accepts → the top hospital has been contacted. */
async function assignedBooking(overrides = {}) {
  const ambulance = await createAmbulance(NEAR);
  const flow = await book(overrides);
  const offer = await pendingOffer(flow.booking._id);
  expect(offer.ambulanceId.toString()).toBe(ambulance.id);
  const crew = await loginAs(ambulance.email);
  const res = await crew.post(`/api/booking-offers/${offer.id}/accept`);
  expect(res.status).toBe(200);
  const emergency = await EmergencyRequest.findById(res.body.data.emergency.id);
  return { ...flow, ambulance, crew, emergency, accepted: res.body.data };
}

describe('create booking', () => {
  it('stores the booking and returns an unguessable token, not a numeric id', async () => {
    const res = await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: nextPhone() }));
    expect(res.status).toBe(201);
    const { token, booking } = res.body.data;
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/); // 24 random bytes = 192 bits
    expect(JSON.stringify(res.body)).not.toMatch(/"id"/);
    expect(booking).toMatchObject({
      status: 'NO_AMBULANCE',
      condition: 'BREATHING',
      urgency: 'CRITICAL',
      retryable: true,
    });
    expect(booking.pickup).toMatchObject({ lat: PICKUP.lat, lng: PICKUP.lng, label: PICKUP.label });

    const stored = await Booking.findOne();
    expect(stored.patientName).toBe('Test Caller');
    expect(stored.phone).toMatch(/^\d{10}$/);
    expect(stored.createdAt).toBeInstanceOf(Date);
    expect(stored.trackingTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.trackingTokenHash).not.toContain(token);
  });

  it('two bookings get different tokens', async () => {
    const a = await book();
    const b = await book();
    expect(a.token).not.toBe(b.token);
  });

  it('normalises Indian phone formats', async () => {
    await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: '+91 98765-43210' }))
      .expect(201);
    expect((await Booking.findOne()).phone).toBe('9876543210');
  });

  it.each([
    ['a short name', { patientName: 'A' }],
    ['a non-Indian number', { phone: '12345' }],
    ['a landline', { phone: '02212345678' }],
    ['notes over 300 characters', { notes: 'x'.repeat(301) }],
    ['an unknown condition', { condition: 'HEADACHE' }],
    ['a missing urgency', { urgency: undefined }],
    ['coordinates out of range', { pickup: { ...PICKUP, lat: 120 } }],
    ['a pickup without an address label', { pickup: { lat: PICKUP.lat, lng: PICKUP.lng } }],
    ['an extra field', { aadhaar: '1234' }],
  ])('rejects %s', async (_name, overrides) => {
    const res = await request().post('/api/bookings').send(bookingBody(overrides));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(await Booking.countDocuments()).toBe(0);
  });

  it('accepts notes of exactly 300 characters and no notes at all', async () => {
    await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: nextPhone(), notes: 'x'.repeat(300) }))
      .expect(201);
    const { notes: _omit, ...withoutNotes } = bookingBody({ phone: nextPhone() });
    await request().post('/api/bookings').send(withoutNotes).expect(201);
  });
});

describe('abuse protection', () => {
  it('allows only one active booking per phone number, whatever the format', async () => {
    await createAmbulance(NEAR);
    const first = await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: '9876511111' }));
    expect(first.status).toBe(201);
    const second = await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: '+91 98765 11111' }));
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('BOOKING_ALREADY_ACTIVE');
    expect(second.body.data?.token).toBeUndefined();
    expect(await Booking.countDocuments({ phone: '9876511111' })).toBe(1);

    // A different number is unaffected, and cancelling frees the first number again.
    await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: '9876522222' }))
      .expect(201);
    await request().post(`/api/bookings/track/${first.body.data.token}/cancel`).expect(200);
    await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: '9876511111' }))
      .expect(201);
  });

  it('the database refuses two active bookings for one phone even without the pre-check', async () => {
    await createAmbulance(NEAR);
    const { booking } = await book({ phone: '9876533333' });
    expect(booking.activePhone).toBe('9876533333');
    const duplicate = { ...booking.toObject(), _id: undefined, trackingTokenHash: 'another-hash' };
    await expect(Booking.create(duplicate)).rejects.toThrow(/E11000/);
  });

  it('limits new bookings per phone number per hour (BOOKING_RATE_LIMIT_PER_PHONE_PER_HOUR)', async () => {
    env.BOOKING_RATE_LIMIT_PER_PHONE_PER_HOUR = 2;
    const phone = '9876544444';
    for (let i = 0; i < 2; i += 1) {
      const res = await request().post('/api/bookings').send(bookingBody({ phone }));
      expect(res.status).toBe(201);
      await request().post(`/api/bookings/track/${res.body.data.token}/cancel`).expect(200);
    }
    const blocked = await request().post('/api/bookings').send(bookingBody({ phone }));
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('RATE_LIMITED');
    // Other numbers are not affected.
    await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: '9876555555' }))
      .expect(201);
  });
});

describe('dispatch to ambulances', () => {
  it('offers to the nearest eligible ambulance first and falls back in distance order', async () => {
    const far = await createAmbulance(FAR);
    const near = await createAmbulance(NEAR);
    const mid = await createAmbulance(MID);
    const { booking, view } = await book();
    expect(view.status).toBe('FINDING_AMBULANCE');

    const order = [];
    for (const expected of [near, mid, far]) {
      const offer = await pendingOffer(booking._id);
      order.push(offer.ambulanceId.toString());
      expect(offer.ambulanceId.toString()).toBe(expected.id);
      expect(new Date(offer.expiresAt) - new Date(offer.offeredAt)).toBe(60_000);
      expect(offer.distanceKm).toBeGreaterThan(0);
      const crew = await loginAs(expected.email);
      expect((await crew.post(`/api/booking-offers/${offer.id}/reject`)).status).toBe(200);
    }
    expect(order).toEqual([near.id, mid.id, far.id]);
    // Nobody left → NO_AMBULANCE, shown to the caller with a retry.
    expect((await Booking.findById(booking._id)).status).toBe('NO_AMBULANCE');
    expect(await AmbulanceOffer.countDocuments({ bookingId: booking._id, status: 'REJECTED' })).toBe(3);
  });

  it('only verified, on-duty ambulances with a recent position are eligible', async () => {
    await createAmbulance({ ...NEAR, onDuty: false });
    await createAmbulance({ ...NEAR, verificationStatus: 'PENDING' });
    await createAmbulance({ ...NEAR, verificationStatus: 'REJECTED' });
    await createAmbulance({ ...NEAR, locationAgeSeconds: env.AMBULANCE_LOCATION_MAX_AGE_SECONDS + 30 });
    await createAmbulance({}); // on duty but never shared a position
    const eligible = await createAmbulance(FAR);
    const { booking } = await book();
    expect((await pendingOffer(booking._id)).ambulanceId.toString()).toBe(eligible.id);
  });

  it('with no eligible ambulance the booking is NO_AMBULANCE and "Try again" re-dispatches', async () => {
    const { token, view } = await book();
    expect(view).toMatchObject({ status: 'NO_AMBULANCE', retryable: true, cancellable: true });
    expect((await Booking.findOne()).activePhone).toBeUndefined();

    const ambulance = await createAmbulance(NEAR);
    const res = await request().post(`/api/bookings/track/${token}/retry`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FINDING_AMBULANCE');
    expect((await pendingOffer((await Booking.findOne())._id)).ambulanceId.toString()).toBe(ambulance.id);
    // Retrying a booking that is not stuck is refused.
    expect((await request().post(`/api/bookings/track/${token}/retry`)).body.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('an ambulance holding a booking or a live offer gets no second offer', async () => {
    await createAmbulance(NEAR);
    const spare = await createAmbulance(FAR);
    const first = await book();
    const second = await book();
    // The nearest ambulance has the first booking's live offer, so the second goes to the spare.
    expect((await pendingOffer(second.booking._id)).ambulanceId.toString()).toBe(spare.id);
    expect(await AmbulanceOffer.countDocuments({ status: 'PENDING' })).toBe(2);
    expect(first.view.status).toBe('FINDING_AMBULANCE');
  });

  it('a timed-out offer falls back to the next ambulance, then to NO_AMBULANCE', async () => {
    const near = await createAmbulance(NEAR);
    const mid = await createAmbulance(MID);
    const { booking } = await book();
    const offer = await pendingOffer(booking._id);
    expect(offer.ambulanceId.toString()).toBe(near.id);

    const sweep = await sweepOnce(new Date(offer.expiresAt.getTime() + 1000));
    expect(sweep.bookingOffers).toBe(1);
    expect((await AmbulanceOffer.findById(offer.id)).status).toBe('TIMEOUT');
    const second = await pendingOffer(booking._id);
    expect(second.ambulanceId.toString()).toBe(mid.id);

    // The late answer from the first ambulance is refused.
    const crew = await loginAs(near.email);
    expect((await crew.post(`/api/booking-offers/${offer.id}/accept`)).body.code).toBe('OFFER_EXPIRED');

    await sweepOnce(new Date(second.expiresAt.getTime() + 1000));
    expect((await Booking.findById(booking._id)).status).toBe('NO_AMBULANCE');
    expect(await AmbulanceOffer.countDocuments({ bookingId: booking._id, status: 'TIMEOUT' })).toBe(2);
  });

  it('accepting after the window closes is refused even before the timer or sweeper ran', async () => {
    const ambulance = await createAmbulance(NEAR);
    const { booking } = await book();
    const offer = await pendingOffer(booking._id);
    await AmbulanceOffer.updateOne({ _id: offer._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const crew = await loginAs(ambulance.email);
    const res = await crew.post(`/api/booking-offers/${offer.id}/accept`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('OFFER_EXPIRED');
    expect(await EmergencyRequest.countDocuments()).toBe(0);
  });

  it("only the offered ambulance can answer, and offers list holds no caller's phone", async () => {
    const near = await createAmbulance(NEAR);
    const other = await createAmbulance(FAR);
    const { booking } = await book();
    const offer = await pendingOffer(booking._id);
    const otherCrew = await loginAs(other.email);
    expect((await otherCrew.post(`/api/booking-offers/${offer.id}/accept`)).status).toBe(403);
    expect((await otherCrew.post(`/api/booking-offers/${offer.id}/reject`)).status).toBe(403);
    expect((await otherCrew.get('/api/booking-offers')).body.data.offers).toEqual([]);

    const crew = await loginAs(near.email);
    const list = await crew.get('/api/booking-offers?status=PENDING');
    expect(list.body.data.offers).toHaveLength(1);
    const item = list.body.data.offers[0];
    expect(item.booking).toMatchObject({
      condition: 'BREATHING',
      urgency: 'CRITICAL',
      notes: 'Blue gate, ground floor',
    });
    expect(JSON.stringify(list.body)).not.toMatch(/98765|Test Caller|caller|phone/i);
  });

  it('refuses unverified ambulances and non-ambulance users', async () => {
    const pending = await createAmbulance({ ...NEAR, verificationStatus: 'PENDING' });
    const crew = await loginAs(pending.email);
    expect((await crew.post('/api/ambulance/duty').send({ onDuty: true })).body.code).toBe('ACCOUNT_NOT_VERIFIED');
    const hospital = await loginAs('lakeside@bedlink.demo');
    expect((await hospital.get('/api/booking-offers')).status).toBe(403);
    expect((await request().get('/api/booking-offers')).status).toBe(401);
  });
});

describe('ambulance accepts → emergency auto-raised', () => {
  it('creates the emergency from the booking and contacts the top hospital', async () => {
    const { booking, ambulance, emergency, accepted } = await assignedBooking();
    expect(emergency.dispatcherId.toString()).toBe(ambulance.id);
    expect(emergency.bookingId.toString()).toBe(booking.id);
    expect(fromPoint(emergency.patientLocation)).toEqual({ lat: PICKUP.lat, lng: PICKUP.lng });
    expect(emergency.urgency).toBe('CRITICAL');
    expect(emergency.requirements.toObject()).toMatchObject(CONDITION_REQUIREMENTS.BREATHING);
    expect(emergency.status).toBe('AWAITING_HOSPITAL');

    const hospitalOffer = await HospitalRequest.findOne({ emergencyId: emergency._id, status: 'PENDING' });
    expect(hospitalOffer.hospitalId.toString()).toBe(emergency.currentHospital.toString());

    const stored = await Booking.findById(booking._id);
    expect(stored).toMatchObject({ status: 'AMBULANCE_ASSIGNED' });
    expect(stored.ambulanceId.toString()).toBe(ambulance.id);
    expect(stored.emergencyId.toString()).toBe(emergency.id);
    expect(stored.currentOfferId).toBeNull();
    // The crew gets the caller's contact only now.
    expect(accepted.booking.caller).toEqual({ name: 'Test Caller', phone: `+91${stored.phone}` });
    expect((await AmbulanceOffer.findOne({ bookingId: booking._id })).status).toBe('ACCEPTED');
  });

  it.each(CONDITION_VALUES)('maps the %s condition through the requirements table', async (condition) => {
    const { emergency, crew } = await assignedBooking({ condition, urgency: 'MODERATE' });
    expect(emergency.requirements.toObject()).toMatchObject(CONDITION_REQUIREMENTS[condition]);
    expect(emergency.urgency).toBe('MODERATE');
    expect(['AWAITING_HOSPITAL', 'NO_MATCH']).toContain(emergency.status); // request-hospital ran
    await crew.post(`/api/emergencies/${emergency.id}/cancel`).expect(200);
  });

  it('the emergency detail shows the booking to its crew only, with caller contact', async () => {
    const { emergency, crew } = await assignedBooking();
    const detail = (await crew.get(`/api/emergencies/${emergency.id}`)).body.data;
    expect(detail.booking).toMatchObject({
      condition: 'BREATHING',
      urgency: 'CRITICAL',
      caller: { name: 'Test Caller' },
      pickup: { label: PICKUP.label },
    });
    expect(detail.booking.caller.phone).toMatch(/^\+91\d{10}$/);
    const stranger = await loginAs('dispatcher2@bedlink.demo');
    expect((await stranger.get(`/api/emergencies/${emergency.id}`)).status).toBe(403);
  });

  it('hospital staff see urgency and condition on the request, the caller only after accepting', async () => {
    const { emergency } = await assignedBooking();
    const staff = await hospitalStaff(emergency.currentHospital);
    const pending = (await staff.get('/api/hospital-requests?status=PENDING')).body.data.requests[0];
    expect(pending.emergency).toMatchObject({ urgency: 'CRITICAL', condition: 'BREATHING' });
    expect(pending.emergency.caller).toBeUndefined();
    expect(JSON.stringify(pending)).not.toMatch(/Test Caller|98765/);

    expect((await staff.post(`/api/hospital-requests/${pending.id}/accept`)).status).toBe(200);
    const accepted = (await staff.get('/api/hospital-requests?status=ACCEPTED')).body.data.requests[0];
    expect(accepted.emergency.caller).toMatchObject({ name: 'Test Caller' });
    expect(accepted.emergency.caller.phone).toMatch(/^\+91\d{10}$/);
  });

  it('a hospital reject falls back to the next hospital without touching the booking', async () => {
    const { token, emergency } = await assignedBooking();
    const first = emergency.currentHospital.toString();
    const staff = await hospitalStaff(first);
    const offer = await HospitalRequest.findOne({ emergencyId: emergency._id, status: 'PENDING' });
    await staff.post(`/api/hospital-requests/${offer.id}/reject`).send({ reason: 'NO_BED' }).expect(200);
    const view = (await track(token)).body.data;
    expect(view.status).toBe('AMBULANCE_ASSIGNED');
    expect(view.hospital.state).toBe('CONTACTING');
    expect((await EmergencyRequest.findById(emergency.id)).currentHospital.toString()).not.toBe(first);
  });

  it('refuses a second accept and an accept after the caller cancelled', async () => {
    const ambulance = await createAmbulance(NEAR);
    const { token, booking } = await book();
    const offer = await pendingOffer(booking._id);
    await request().post(`/api/bookings/track/${token}/cancel`).expect(200);
    const crew = await loginAs(ambulance.email);
    expect((await crew.post(`/api/booking-offers/${offer.id}/accept`)).body.code).toBe('OFFER_ALREADY_RESOLVED');
    expect(await EmergencyRequest.countDocuments()).toBe(0);
  });

  it('accepting twice at once assigns the booking to exactly one ambulance and raises one emergency', async () => {
    const ambulance = await createAmbulance(NEAR);
    const { booking } = await book();
    const offer = await pendingOffer(booking._id);
    const results = await Promise.allSettled([
      acceptBookingOffer(offer.id, ambulance.authUser),
      acceptBookingOffer(offer.id, ambulance.authUser),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await EmergencyRequest.countDocuments({ bookingId: booking._id })).toBe(1);
  });
});

describe('tracking by token', () => {
  it('a wrong, malformed or other booking token gets 404 and reveals nothing', async () => {
    const a = await book();
    const b = await book();
    for (const bad of ['nope', 'x'.repeat(32), `${a.token}x`, a.token.slice(1)]) {
      for (const [method, path] of [
        ['get', `/api/bookings/track/${bad}`],
        ['post', `/api/bookings/track/${bad}/cancel`],
        ['post', `/api/bookings/track/${bad}/retry`],
      ]) {
        const res = await request()[method](path);
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
      }
    }
    // Each token reaches only its own booking.
    const own = (await track(a.token)).body.data;
    expect(own.pickup.label).toBe(PICKUP.label);
    expect((await Booking.findById(b.booking._id)).status).toBe('NO_AMBULANCE');
    expect(JSON.stringify(own)).not.toMatch(/98765|Test Caller|trackingTokenHash|activePhone/);
  });

  it('shows ambulance details once assigned and the hospital as it accepts', async () => {
    const { token, ambulance, emergency } = await assignedBooking();
    let view = (await track(token)).body.data;
    expect(view.status).toBe('AMBULANCE_ASSIGNED');
    expect(view.ambulance).toMatchObject({
      vehicleNumber: expect.stringMatching(/^MH01AB/),
      ambulanceType: 'ALS',
      organization: 'Test Ambulance Trust',
    });
    expect(view.ambulance.phone).toMatch(/^98000/);
    expect(view.hospital.state).toBe('CONTACTING');
    expect(view.hospital.name).toBeTruthy();
    expect(ambulance.id).toBeTruthy();

    const staff = await hospitalStaff(emergency.currentHospital);
    const offer = await HospitalRequest.findOne({ emergencyId: emergency._id, status: 'PENDING' });
    expect((await staff.post(`/api/hospital-requests/${offer.id}/accept`)).status).toBe(200);

    view = (await track(token)).body.data;
    const reservation = await Reservation.findOne({ requestId: emergency._id });
    const bed = await Bed.findById(reservation.bedId);
    expect(view.hospital).toMatchObject({
      state: 'ACCEPTED',
      bedType: bed.type,
      address: expect.any(String),
      etaMinutes: offer.matchSnapshot.etaMinutes,
    });
    expect(new Date(view.hospital.heldUntil).getTime()).toBe(reservation.expiresAt.getTime());
    expect(JSON.stringify(view)).not.toContain(bed.label); // internal bed labels stay internal
  });

  it('marks the booking COMPLETED and the stage ARRIVED when the hospital marks the patient arrived', async () => {
    const { token, booking, emergency } = await assignedBooking();
    const staff = await hospitalStaff(emergency.currentHospital);
    const offer = await HospitalRequest.findOne({ emergencyId: emergency._id, status: 'PENDING' });
    const accepted = await staff.post(`/api/hospital-requests/${offer.id}/accept`);
    await staff.post(`/api/reservations/${accepted.body.data.reservation.id}/arrive`).expect(200);

    const view = (await track(token)).body.data;
    expect(view.status).toBe('COMPLETED');
    expect(view.hospital.state).toBe('ARRIVED');
    expect(view.cancellable).toBe(false);
    const stored = await Booking.findById(booking._id);
    expect(stored.closedAt).toBeInstanceOf(Date);
    expect(stored.activePhone).toBeUndefined();
    expect((await request().post(`/api/bookings/track/${token}/cancel`)).body.code).toBe('INVALID_STATE_TRANSITION');
  });
});

describe('live location and ETA', () => {
  it('stores positions at most once per interval and only while on duty', async () => {
    const off = await createAmbulance({ ...NEAR, onDuty: false });
    await expect(updateAmbulanceLocation(off.authUser, MID)).rejects.toMatchObject({ code: 'AMBULANCE_NOT_ON_DUTY' });

    const crew = await createAmbulance({});
    const t0 = new Date();
    expect(await updateAmbulanceLocation(crew.authUser, NEAR, t0)).toEqual({ stored: true });
    expect(await updateAmbulanceLocation(crew.authUser, MID, new Date(t0.getTime() + 3000))).toEqual({ stored: false });
    expect(await updateAmbulanceLocation(crew.authUser, MID, new Date(t0.getTime() + 10_500))).toEqual({
      stored: true,
    });
    const doc = await (await import('../src/models/index.js')).User.findById(crew.id);
    expect(doc.ambulance.location.lat).toBeCloseTo(MID.lat, 6);
    expect(doc.ambulance.locationAt.getTime()).toBe(t0.getTime() + 10_500);
  });

  it('the duty toggle is saved, and going off duty removes the ambulance from dispatch', async () => {
    const crew = await createAmbulance({ ...NEAR, onDuty: false });
    const agent = await loginAs(crew.email);
    const on = await agent.post('/api/ambulance/duty').send({ onDuty: true });
    expect(on.body.data.onDuty).toBe(true);
    expect((await agent.get('/api/auth/me')).body.data.user.ambulance.onDuty).toBe(true);
    expect((await agent.post('/api/ambulance/duty').send({ onDuty: 'yes' })).status).toBe(400);
    await agent.post('/api/ambulance/duty').send({ onDuty: false }).expect(200);
    const { view } = await book();
    expect(view.status).toBe('NO_AMBULANCE');
  });

  it('moves the booking ON_THE_WAY on the first fix, recomputes the ETA each time, then AT_PICKUP', async () => {
    const { token, ambulance, booking } = await assignedBooking();
    const emitted = [];
    const stop = onEmit((event, rooms, payload) => emitted.push({ event, rooms, payload }));
    const t0 = new Date(Date.now() + 60_000);

    await updateAmbulanceLocation(ambulance.authUser, MID, t0);
    let view = (await track(token)).body.data;
    expect(view.status).toBe('ON_THE_WAY');
    expect(view.ambulance.location).toEqual(MID);
    const first = view.ambulance;
    expect(first.etaMinutes).toBeGreaterThan(0);

    await updateAmbulanceLocation(ambulance.authUser, NEAR, new Date(t0.getTime() + 11_000));
    view = (await track(token)).body.data;
    expect(view.ambulance.etaMinutes).toBeLessThan(first.etaMinutes);
    expect(view.ambulance.distanceKm).toBeLessThan(first.distanceKm);

    const locations = emitted.filter((e) => e.event === 'booking:ambulance-location');
    expect(locations).toHaveLength(2);
    expect(locations[0].rooms).toEqual([`booking:${booking.id}`]);
    expect(locations[0].payload).toMatchObject({
      location: MID,
      etaMinutes: first.etaMinutes,
      distanceKm: first.distanceKm,
    });
    expect(locations[1].payload.etaMinutes).toBe(view.ambulance.etaMinutes);

    // Within BOOKING_PICKUP_RADIUS_METERS the ambulance has reached the caller: no more cancelling.
    const close = { lat: PICKUP.lat + 0.0004, lng: PICKUP.lng };
    await updateAmbulanceLocation(ambulance.authUser, close, new Date(t0.getTime() + 22_000));
    view = (await track(token)).body.data;
    expect(view).toMatchObject({ status: 'AT_PICKUP', cancellable: false });
    const res = await request().post(`/api/bookings/track/${token}/cancel`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_NOT_CANCELLABLE');
    stop();
  });
});

describe('cancel', () => {
  it('withdraws a pending ambulance offer', async () => {
    const ambulance = await createAmbulance(NEAR);
    const { token, booking } = await book();
    const offer = await pendingOffer(booking._id);
    const emitted = [];
    const stop = onEmit((event, rooms, payload) => emitted.push({ event, rooms, payload }));
    const res = await request().post(`/api/bookings/track/${token}/cancel`);
    stop();
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', cancellable: false });
    expect((await AmbulanceOffer.findById(offer.id)).status).toBe('CANCELLED');
    const withdrawn = emitted.find((e) => e.event === 'booking:offer-cancelled');
    expect(withdrawn.rooms).toEqual([`dispatcher:${ambulance.id}`]);
    expect((await Booking.findById(booking._id)).activePhone).toBeUndefined();
  });

  it('cascades to the emergency, the pending hospital request and the crew', async () => {
    const { token, booking, emergency, crew } = await assignedBooking();
    const hospitalOffer = await HospitalRequest.findOne({ emergencyId: emergency._id, status: 'PENDING' });
    const res = await request().post(`/api/bookings/track/${token}/cancel`);
    expect(res.status).toBe(200);
    expect((await Booking.findById(booking._id)).status).toBe('CANCELLED');
    expect((await EmergencyRequest.findById(emergency.id)).status).toBe('CANCELLED');
    expect((await HospitalRequest.findById(hospitalOffer.id)).status).toBe('CANCELLED');
    const detail = (await crew.get(`/api/emergencies/${emergency.id}`)).body.data;
    expect(detail.timeline.at(-1)).toMatchObject({ event: 'REQUEST_CANCELLED', metadata: { cancelledBy: 'CALLER' } });
    // The crew is free again for the next booking.
    const next = await book();
    expect(next.view.status).toBe('FINDING_AMBULANCE');
  });

  it('releases the held bed when the hospital had already accepted', async () => {
    const { token, emergency } = await assignedBooking();
    const staff = await hospitalStaff(emergency.currentHospital);
    const offer = await HospitalRequest.findOne({ emergencyId: emergency._id, status: 'PENDING' });
    const accepted = await staff.post(`/api/hospital-requests/${offer.id}/accept`);
    const reservation = await Reservation.findById(accepted.body.data.reservation.id);
    expect((await Bed.findById(reservation.bedId)).status).toBe('RESERVED');

    await request().post(`/api/bookings/track/${token}/cancel`).expect(200);
    expect((await Reservation.findById(reservation.id)).status).toBe('RELEASED');
    expect((await Bed.findById(reservation.bedId)).status).toBe('AVAILABLE');
    expect((await EmergencyRequest.findById(emergency.id)).status).toBe('CANCELLED');
    expect((await track(token)).body.data.hospital.state).toBe('NONE');
  });

  it('a crew cancelling the emergency cancels the booking too', async () => {
    const { token, crew, emergency } = await assignedBooking();
    await crew.post(`/api/emergencies/${emergency.id}/cancel`).expect(200);
    const view = (await track(token)).body.data;
    expect(view).toMatchObject({ status: 'CANCELLED', cancellable: false });
  });
});

describe('privacy', () => {
  it('purges personal fields of closed bookings after BOOKING_PII_RETENTION_DAYS and keeps active ones', async () => {
    const closed = await book({ phone: '9876566661' });
    await request().post(`/api/bookings/track/${closed.token}/cancel`).expect(200);
    await createAmbulance(NEAR);
    const active = await book({ phone: '9876566662' });

    const day = 24 * 60 * 60_000;
    expect(await purgeBookingPersonalData(new Date(Date.now() + (env.BOOKING_PII_RETENTION_DAYS - 1) * day))).toBe(0);
    expect(await purgeBookingPersonalData(new Date(Date.now() + (env.BOOKING_PII_RETENTION_DAYS + 1) * day))).toBe(1);

    const purged = await Booking.findById(closed.booking._id).lean();
    expect(purged).toMatchObject({ patientName: '', phone: '', notes: '', pickupLabel: '', condition: 'BREATHING' });
    expect(purged.pickupLocation).toBeUndefined();
    expect(purged.trackingTokenHash).toBeUndefined();
    expect(purged.piiPurgedAt).toBeInstanceOf(Date);
    expect((await track(closed.token)).status).toBe(404); // the old link is dead
    expect((await Booking.findById(active.booking._id)).phone).toBe('9876566662');
  });

  it('the sweeper runs the purge', async () => {
    const closed = await book();
    await request().post(`/api/bookings/track/${closed.token}/cancel`).expect(200);
    const later = new Date(Date.now() + (env.BOOKING_PII_RETENTION_DAYS + 1) * 24 * 60 * 60_000);
    const swept = await sweepOnce(later);
    expect(swept.purgedBookings).toBe(1);
    expect((await Booking.findById(closed.booking._id)).phone).toBe('');
  });

  it('no list endpoint returns the phone number', async () => {
    const { crew, emergency } = await assignedBooking();
    const staff = await hospitalStaff(emergency.currentHospital);
    const admin = await loginAs('admin@bedlink.demo');
    const bodies = [
      (await crew.get('/api/emergencies')).body,
      (await crew.get('/api/booking-offers')).body,
      (await staff.get('/api/hospital-requests')).body,
      (await admin.get('/api/emergencies')).body,
      (await admin.get('/api/admin/verifications/ambulances?status=ALL')).body,
    ];
    for (const body of bodies) expect(JSON.stringify(body)).not.toMatch(/9876500|Test Caller/);
  });

  it('stores nothing beyond the listed fields', () => {
    const paths = Object.keys(Booking.schema.paths);
    expect(paths.filter((p) => /aadhaar|email|photo|address|age|gender/i.test(p))).toEqual([]);
  });
});
