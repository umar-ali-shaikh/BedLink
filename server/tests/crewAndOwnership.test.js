import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import {
  AmbulanceOffer,
  Bed,
  Booking,
  EmergencyRequest,
  FakeReport,
  Hospital,
  HospitalRequest,
  Reservation,
  User,
} from '../src/models/index.js';
import { onEmit } from '../src/services/notification/index.js';
import { PICKUP, bookingBody, createAmbulance, phoneN } from './fixtures/bookingFixtures.js';
import { ICU_VENT_CARDIO, loginAs, request, resetDb, startTestDb, stopTestDb } from './helpers/testServer.js';

let seed;
beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  seed = await resetDb();
});
afterEach(() => {
  env.FAKE_REPORT_BLOCK_THRESHOLD = 3;
  env.FAKE_REPORT_BLOCK_HOURS = 72;
});

const NEAR = { lat: PICKUP.lat + 0.01, lng: PICKUP.lng };
const slugOf = (id) => Object.entries(seed.hospitals).find(([, h]) => h._id.toString() === id.toString())[0];
const staffOf = (id) => loginAs(`${slugOf(id)}@bedlink.demo`);

const ambulanceBody = (over = {}) => ({
  name: 'Account Holder',
  email: 'holder@crew.test',
  password: 'Ambulance1',
  phone: '9876543210',
  vehicleNumber: 'MH01AB1234',
  ambulanceType: 'ALS',
  driverName: 'Suresh Patil',
  licenceNumber: 'MH14 2011 0062821',
  ...over,
});

const hospitalBody = (over = {}, n = 1) => ({
  hospital: {
    name: `Ownership Test Hospital ${n}`,
    address: 'Marine Drive, Mumbai',
    coordinates: { lat: 19 + n / 100, lng: 72.8 },
    ownership: 'GOVERNMENT',
    specialties: [],
    registrationNumber: `MH/CE/2024/0${n}0001`,
    phone: '9876501234',
    email: `info${n}@ownership.test`,
    ...over,
  },
  contact: { name: 'Dr Meera Shah', email: `meera${n}@ownership.test`, password: 'Hospital9' },
});

describe('ambulance registration: driver and licence', () => {
  it('stores the driver and a normalised licence under User.ambulance', async () => {
    const res = await request().post('/api/auth/register/ambulance').send(ambulanceBody());
    expect(res.status).toBe(201);
    const stored = await User.findOne({ email: 'holder@crew.test' });
    expect(stored.ambulance.driverName).toBe('Suresh Patil');
    expect(stored.ambulance.licenceNumber).toBe('MH1420110062821'); // spaces removed, uppercased
    expect(res.body.data.user.ambulance).toMatchObject({
      driverName: 'Suresh Patil',
      licenceNumber: 'MH1420110062821',
    });
  });

  it.each([
    ['too short', 'MH14201100628'],
    ['16 characters', 'MH142011006282100'],
    ['digits where the state letters go', '1414201100628210'.slice(0, 15)],
    ['letters in the serial', 'MH14201100628AB'],
    ['empty', ''],
  ])('rejects a licence that is %s', async (_name, licenceNumber) => {
    const res = await request().post('/api/auth/register/ambulance').send(ambulanceBody({ licenceNumber }));
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.path)).toContain('body.licenceNumber');
  });

  it('accepts hyphens and lowercase', async () => {
    const res = await request()
      .post('/api/auth/register/ambulance')
      .send(ambulanceBody({ licenceNumber: 'mh-14-2011-0062821' }));
    expect(res.status).toBe(201);
    expect((await User.findOne({ email: 'holder@crew.test' })).ambulance.licenceNumber).toBe('MH1420110062821');
  });

  it('refuses a licence that another ambulance already uses, with a field-level 409', async () => {
    await request().post('/api/auth/register/ambulance').send(ambulanceBody()).expect(201);
    const dup = await request()
      .post('/api/auth/register/ambulance')
      .send(
        ambulanceBody({ email: 'second@crew.test', vehicleNumber: 'MH02CD5678', licenceNumber: 'mh14 2011 0062821' })
      );
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('DUPLICATE_RESOURCE');
    expect(dup.body.details[0].path).toBe('licenceNumber');
    expect(await User.countDocuments({ 'ambulance.licenceNumber': 'MH1420110062821' })).toBe(1);
  });

  it('requires the driver full name (and keeps the login email required)', async () => {
    for (const driverName of [undefined, '', 'A']) {
      const res = await request().post('/api/auth/register/ambulance').send(ambulanceBody({ driverName }));
      expect(res.status).toBe(400);
      expect(res.body.details.map((d) => d.path)).toContain('body.driverName');
    }
    const noEmail = await request()
      .post('/api/auth/register/ambulance')
      .send(ambulanceBody({ email: undefined }));
    expect(noEmail.body.details.map((d) => d.path)).toContain('body.email');
  });
});

describe('ambulance profile', () => {
  it('lets the crew change only phone and organisation', async () => {
    await request().post('/api/auth/register/ambulance').send(ambulanceBody()).expect(201);
    const agent = await (async () => {
      const a = (await import('supertest')).default.agent((await import('../src/app.js')).createApp());
      await a.post('/api/auth/login').send({ email: 'holder@crew.test', password: 'Ambulance1' }).expect(200);
      return a;
    })();

    const ok = await agent.patch('/api/ambulance/profile').send({ phone: '98123 45678', organization: 'City Trust' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.ambulance).toMatchObject({
      phone: '9812345678',
      organization: 'City Trust',
      driverName: 'Suresh Patil',
    });
    const stored = await User.findOne({ email: 'holder@crew.test' });
    expect(stored.phone).toBe('9812345678');
    expect(stored.ambulance).toMatchObject({ organization: 'City Trust', vehicleNumber: 'MH01AB1234' });

    for (const forbidden of [
      { vehicleNumber: 'MH09ZZ9999' },
      { licenceNumber: 'MH14201100000001' },
      { driverName: 'Someone Else' },
      { verificationStatus: 'VERIFIED' },
      { role: 'ADMIN' },
      { name: 'X Y' },
    ]) {
      const res = await agent.patch('/api/ambulance/profile').send({ phone: '9812345678', ...forbidden });
      expect(res.status).toBe(400);
    }
    expect((await agent.patch('/api/ambulance/profile').send({})).status).toBe(400);
    expect((await agent.patch('/api/ambulance/profile').send({ phone: '12345' })).status).toBe(400);
    const after = await User.findOne({ email: 'holder@crew.test' });
    expect(after.ambulance.vehicleNumber).toBe('MH01AB1234');
    expect(after.ambulance.licenceNumber).toBe('MH1420110062821');
    expect(after.verificationStatus).toBe('PENDING');

    const hospital = await loginAs('lakeside@bedlink.demo');
    expect((await hospital.patch('/api/ambulance/profile').send({ phone: '9812345678' })).status).toBe(403);
  });
});

describe('hospital ownership', () => {
  it('is required and checked against the enum', async () => {
    for (const ownership of [undefined, 'NGO', 'private', '']) {
      const res = await request().post('/api/auth/register/hospital').send(hospitalBody({ ownership }));
      expect(res.status).toBe(400);
      expect(res.body.details.map((d) => d.path)).toContain('body.hospital.ownership');
    }
    expect(await Hospital.countDocuments({ name: /Ownership Test/ })).toBe(0);
  });

  it.each(['GOVERNMENT', 'SEMI_GOVERNMENT', 'PRIVATE'])('stores %s', async (ownership) => {
    const n = ['GOVERNMENT', 'SEMI_GOVERNMENT', 'PRIVATE'].indexOf(ownership) + 1;
    await request().post('/api/auth/register/hospital').send(hospitalBody({ ownership }, n)).expect(201);
    expect((await Hospital.findOne({ name: `Ownership Test Hospital ${n}` })).ownership).toBe(ownership);
  });

  it('older hospitals have none, and ranked candidates carry it without changing the order', async () => {
    const before = (await (await loginAs('dispatcher1@bedlink.demo')).post('/api/emergencies').send(ICU_VENT_CARDIO))
      .body.data;
    expect(before.candidates.every((c) => c.ownership === null)).toBe(true);

    await Hospital.updateOne({ _id: seed.hospitals.lakeside._id }, { $set: { ownership: 'GOVERNMENT' } });
    const after = (await (await loginAs('dispatcher1@bedlink.demo')).post('/api/emergencies').send(ICU_VENT_CARDIO))
      .body.data;
    expect(after.candidates.map((c) => [c.hospitalName, c.score])).toEqual(
      before.candidates.map((c) => [c.hospitalName, c.score])
    );
    expect(after.candidates.find((c) => c.hospitalName === 'Lakeside Medical Centre').ownership).toBe('GOVERNMENT');
  });
});

describe('hospitals see who is coming', () => {
  async function offeredToLakeside() {
    const crew = await createAmbulance({ ...NEAR });
    await User.updateOne({ _id: crew.id }, { $set: { phone: '9811122233' } });
    const agent = await loginAs(crew.email);
    const emitted = [];
    const stop = onEmit((event, rooms, payload) => emitted.push({ event, rooms, payload }));
    const created = await agent.post('/api/emergencies').send(ICU_VENT_CARDIO);
    await agent.post(`/api/emergencies/${created.body.data.id}/request-hospital`).expect(200);
    stop();
    return { crew, agent, emergencyId: created.body.data.id, emitted };
  }

  it('the hospital:request payload and the offered hospital’s views carry the crew contact', async () => {
    const { emergencyId, emitted } = await offeredToLakeside();
    const sent = emitted.find((e) => e.event === 'hospital:request');
    expect(sent.rooms).toEqual([`hospital:${seed.hospitals.lakeside._id}`]);
    const expected = {
      vehicleNumber: expect.stringMatching(/^MH01AB/),
      ambulanceType: 'ALS',
      organization: 'Test Ambulance Trust',
      driverName: expect.stringMatching(/^Driver /),
      phone: '9811122233',
    };
    expect(sent.payload.ambulance).toEqual(expected);

    const lakeside = await loginAs('lakeside@bedlink.demo');
    const list = (await lakeside.get('/api/hospital-requests?status=PENDING')).body.data.requests;
    expect(list[0].emergency.ambulance).toEqual(expected);
    const detail = (await lakeside.get(`/api/emergencies/${emergencyId}`)).body.data;
    expect(detail.ambulance).toEqual(expected);

    await lakeside.post(`/api/hospital-requests/${list[0].id}/accept`).expect(200);
    const reservations = (await lakeside.get('/api/reservations?status=ACTIVE')).body.data;
    expect(reservations[0].ambulance).toEqual(expected);
  });

  it('another hospital, other roles and other ambulances never get them', async () => {
    const { emergencyId, emitted, crew } = await offeredToLakeside();
    const city = await loginAs('citygeneral@bedlink.demo');
    const cityList = await city.get('/api/hospital-requests');
    expect(cityList.body.data.requests).toEqual([]);
    expect((await city.get(`/api/emergencies/${emergencyId}`)).status).toBe(403);
    expect(JSON.stringify(cityList.body)).not.toContain(crew.email);
    expect(
      emitted.filter(
        (e) => e.event === 'hospital:request' && !e.rooms.includes(`hospital:${seed.hospitals.lakeside._id}`)
      )
    ).toEqual([]);

    const admin = await loginAs('admin@bedlink.demo');
    const other = await loginAs('dispatcher2@bedlink.demo');
    for (const body of [
      (await admin.get('/api/hospital-requests')).body,
      (await other.get('/api/emergencies')).body,
      (await admin.get('/api/reservations')).body,
    ]) {
      expect(JSON.stringify(body)).not.toMatch(/"ambulance"|9811122233|Driver \d/);
    }
  });
});

describe('ambulance cancels a booking with a reason', () => {
  async function assigned(phone) {
    const crew = await createAmbulance(NEAR);
    const res = await request().post('/api/bookings').send(bookingBody({ phone }));
    const offer = await AmbulanceOffer.findOne({ status: 'PENDING', ambulanceId: crew.id });
    const agent = await loginAs(crew.email);
    const accepted = await agent.post(`/api/booking-offers/${offer.id}/accept`);
    expect(accepted.status).toBe(200);
    return {
      crew,
      agent,
      token: res.body.data.token,
      booking: await Booking.findOne({ phone }),
      emergencyId: accepted.body.data.emergency.id,
    };
  }
  const cancel = (agent, bookingId, body) => agent.post(`/api/ambulance/bookings/${bookingId}/cancel`).send(body);

  it('requires a valid reason, and a note for OTHER', async () => {
    const { agent, booking } = await assigned(phoneN(1));
    for (const body of [
      {},
      { reason: 'BORED' },
      { reason: 'OTHER' },
      { reason: 'OTHER', note: 'x' },
      { reason: 'DUPLICATE', extra: 1 },
    ]) {
      expect((await cancel(agent, booking.id, body)).status).toBe(400);
    }
    expect((await Booking.findById(booking.id)).status).toBe('AMBULANCE_ASSIGNED');
  });

  it('cascades: booking, hospital offer, emergency and held bed; the caller sees the reason live', async () => {
    const { agent, token, booking, emergencyId } = await assigned(phoneN(2));
    const hospitalOffer = await HospitalRequest.findOne({ emergencyId, status: 'PENDING' });
    const staff = await staffOf(hospitalOffer.hospitalId);
    const accepted = await staff.post(`/api/hospital-requests/${hospitalOffer.id}/accept`);
    const reservation = await Reservation.findById(accepted.body.data.reservation.id);
    expect((await Bed.findById(reservation.bedId)).status).toBe('RESERVED');

    const emitted = [];
    const stop = onEmit((event, rooms, payload) => emitted.push({ event, rooms, payload }));
    const res = await cancel(agent, booking.id, { reason: 'CALLER_UNREACHABLE', note: 'Phone off' });
    stop();
    expect(res.status).toBe(200);

    const stored = await Booking.findById(booking.id);
    expect(stored).toMatchObject({
      status: 'CANCELLED',
      cancelledBy: 'AMBULANCE',
      cancelReason: 'CALLER_UNREACHABLE',
      cancelNote: 'Phone off',
    });
    expect(stored.activePhone).toBeUndefined();
    expect((await EmergencyRequest.findById(emergencyId)).status).toBe('CANCELLED');
    expect((await Reservation.findById(reservation.id)).status).toBe('RELEASED');
    expect((await Bed.findById(reservation.bedId)).status).toBe('AVAILABLE');
    const updated = emitted.find((e) => e.event === 'booking:updated');
    expect(updated.rooms).toContain(`booking:${booking.id}`);

    const view = (await request().get(`/api/bookings/track/${token}`)).body.data;
    expect(view).toMatchObject({
      status: 'CANCELLED',
      cancellation: { by: 'AMBULANCE', reason: 'CALLER_UNREACHABLE', note: 'Phone off' },
      cancellable: false,
    });
    // CALLER_UNREACHABLE is not a fake report.
    expect(await FakeReport.countDocuments()).toBe(0);
  });

  it('withdraws a pending hospital offer and works until the ambulance has reached the caller', async () => {
    const { agent, booking, emergencyId } = await assigned(phoneN(3));
    const pending = await HospitalRequest.findOne({ emergencyId, status: 'PENDING' });
    await Booking.updateOne({ _id: booking._id }, { $set: { status: 'AT_PICKUP' } });
    expect((await cancel(agent, booking.id, { reason: 'DUPLICATE' })).status).toBe(200);
    expect((await HospitalRequest.findById(pending.id)).status).toBe('CANCELLED');
    // Already cancelled: a second attempt is refused.
    expect((await cancel(agent, booking.id, { reason: 'DUPLICATE' })).body.code).toBe('INVALID_STATE_TRANSITION');
  });

  it('only the assigned ambulance may cancel, and the caller can book again afterwards', async () => {
    const { agent, booking } = await assigned(phoneN(4));
    const stranger = await createAmbulance({ lat: 19.2, lng: 72.9 });
    const other = await loginAs(stranger.email);
    expect((await cancel(other, booking.id, { reason: 'DUPLICATE' })).status).toBe(403);
    expect(
      (await request().post(`/api/ambulance/bookings/${booking.id}/cancel`).send({ reason: 'DUPLICATE' })).status
    ).toBe(401);
    await cancel(agent, booking.id, { reason: 'PATIENT_ALREADY_TRANSPORTED' }).expect(200);
    await request()
      .post('/api/bookings')
      .send(bookingBody({ phone: phoneN(4) }))
      .expect(201);
  });
});

describe('fake report blocking', () => {
  const DAY = 24 * 60 * 60_000;

  /** One full cycle: book → ambulance accepts → ambulance cancels with `reason`. */
  async function reportedBooking(crew, agent, phone, reason) {
    const res = await request().post('/api/bookings').send(bookingBody({ phone }));
    expect(res.status).toBe(201);
    const offer = await AmbulanceOffer.findOne({ status: 'PENDING', ambulanceId: crew.id });
    const accepted = await agent.post(`/api/booking-offers/${offer.id}/accept`);
    const booking = await Booking.findOne({ phone, status: 'AMBULANCE_ASSIGNED' });
    await agent.post(`/api/ambulance/bookings/${booking.id}/cancel`).send({ reason }).expect(200);
    return accepted;
  }

  it('blocks a number after FAKE_REPORT_BLOCK_THRESHOLD reports and unblocks after the block window', async () => {
    const crew = await createAmbulance(NEAR);
    const agent = await loginAs(crew.email);
    const phone = phoneN(10);

    await reportedBooking(crew, agent, phone, 'FAKE_OR_PRANK');
    await reportedBooking(crew, agent, phone, 'FAKE_OR_PRANK');
    // Two reports: still allowed. Reasons other than FAKE_OR_PRANK never count.
    await reportedBooking(crew, agent, phone, 'DUPLICATE');
    expect(await FakeReport.countDocuments()).toBe(2);
    await reportedBooking(crew, agent, phone, 'FAKE_OR_PRANK');
    expect(await FakeReport.countDocuments()).toBe(3);

    const blocked = await request().post('/api/bookings').send(bookingBody({ phone }));
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('PHONE_BLOCKED');
    expect(blocked.body.message).toMatch(/false requests.*hours/s);
    expect(blocked.body.details[0].path).toBe('phone');
    expect(blocked.body.data?.token).toBeUndefined();
    // Formatting variants of the same number are blocked too; other numbers are not.
    expect(
      (
        await request()
          .post('/api/bookings')
          .send(bookingBody({ phone: `+91 ${phone}` }))
      ).status
    ).toBe(403);
    expect(
      (
        await request()
          .post('/api/bookings')
          .send(bookingBody({ phone: phoneN(11) }))
      ).status
    ).toBe(201);

    // The block lasts FAKE_REPORT_BLOCK_HOURS after the latest report...
    await FakeReport.updateMany({}, { $set: { reportedAt: new Date(Date.now() - 71 * 60 * 60_000) } });
    expect((await request().post('/api/bookings').send(bookingBody({ phone }))).status).toBe(403);
    // ...then the number can book again (the reports still exist, but the block is over).
    await FakeReport.updateMany({}, { $set: { reportedAt: new Date(Date.now() - 73 * 60 * 60_000) } });
    expect((await request().post('/api/bookings').send(bookingBody({ phone }))).status).toBe(201);
  });

  it('honours the env settings (threshold, window) and ignores reports older than the window', async () => {
    env.FAKE_REPORT_BLOCK_THRESHOLD = 1;
    const crew = await createAmbulance(NEAR);
    const agent = await loginAs(crew.email);
    const phone = phoneN(12);
    await reportedBooking(crew, agent, phone, 'FAKE_OR_PRANK');
    expect((await request().post('/api/bookings').send(bookingBody({ phone }))).body.code).toBe('PHONE_BLOCKED');
    await FakeReport.updateMany(
      {},
      { $set: { reportedAt: new Date(Date.now() - (env.FAKE_REPORT_WINDOW_DAYS + 1) * DAY) } }
    );
    expect((await request().post('/api/bookings').send(bookingBody({ phone }))).status).toBe(201);
  });

  it('stores only a hash of the number and expires reports with a TTL index equal to the window', async () => {
    const crew = await createAmbulance(NEAR);
    const agent = await loginAs(crew.email);
    await reportedBooking(crew, agent, phoneN(13), 'FAKE_OR_PRANK');
    const raw = JSON.stringify(await FakeReport.find().lean());
    expect(raw).not.toContain(phoneN(13));
    const ttl = (await FakeReport.collection.indexes()).find((i) => i.name === 'fake_report_ttl');
    expect(ttl.expireAfterSeconds).toBe(env.FAKE_REPORT_WINDOW_DAYS * 24 * 60 * 60);
  });
});
