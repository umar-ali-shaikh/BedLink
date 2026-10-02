import { io as connect } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../src/constants/socketEvents.js';
import { AmbulanceOffer, EmergencyRequest, HospitalRequest } from '../src/models/index.js';
import { PICKUP, bookingBody, createAmbulance, phoneN } from './fixtures/bookingFixtures.js';
import { loginAs, request, resetDb, startHttpServer, startTestDb, stopTestDb } from './helpers/testServer.js';

let server;
let seed;
let phoneCounter = 0;
const sockets = [];

beforeAll(async () => {
  await startTestDb();
  server = await startHttpServer();
});
afterAll(async () => {
  for (const s of sockets) s.disconnect();
  await server.close();
  await stopTestDb();
});
beforeEach(async () => {
  seed = await resetDb();
});

const NEAR = { lat: PICKUP.lat + 0.01, lng: PICKUP.lng };

function open({ cookie, bookingToken } = {}) {
  const socket = connect(server.url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: cookie ? { Cookie: cookie } : {},
    auth: bookingToken ? { bookingToken } : {},
  });
  sockets.push(socket);
  return socket;
}

const connected = (socket) =>
  new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });

/** Collect every event the socket receives, so tests can assert on what did and did not arrive. */
function record(socket) {
  const events = [];
  socket.onAny((event, payload) => events.push({ event, payload }));
  return events;
}

const waitForEvent = async (events, event, predicate = () => true, timeout = 3000) => {
  const deadline = Date.now() + timeout;
  for (;;) {
    const found = events.find((e) => e.event === event && predicate(e.payload));
    if (found) return found.payload;
    if (Date.now() > deadline) throw new Error(`no ${event} within ${timeout}ms (got ${events.map((e) => e.event)})`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};

const emitAck = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

async function book(overrides = {}) {
  const res = await request()
    .post('/api/bookings')
    .send(bookingBody({ phone: phoneN(++phoneCounter), ...overrides }));
  expect(res.status).toBe(201);
  return res.body.data.token;
}

describe('booking room', () => {
  it('refuses a wrong tracking token and a connection with neither cookie nor token', async () => {
    await book();
    await expect(connected(open({ bookingToken: 'not-a-real-token' }))).rejects.toThrow('UNAUTHORIZED');
    await expect(connected(open())).rejects.toThrow('UNAUTHORIZED');
  });

  it('a guest with a valid token joins only its own booking room', async () => {
    const mine = await book();
    const other = await book();
    const socket = open({ bookingToken: mine });
    await connected(socket);
    const events = record(socket);

    // Cancelling the other booking is none of this caller's business.
    await request().post(`/api/bookings/track/${other}/cancel`).expect(200);
    await request().post(`/api/bookings/track/${mine}/cancel`).expect(200);
    const update = await waitForEvent(events, SERVER_EVENTS.BOOKING_UPDATED);
    expect(update).toMatchObject({ status: 'CANCELLED' });
    expect(events.filter((e) => e.event === SERVER_EVENTS.BOOKING_UPDATED)).toHaveLength(1);

    // A guest has no handlers: it cannot send location, join rooms or answer offers.
    const ack = await Promise.race([
      emitAck(socket, CLIENT_EVENTS.AMBULANCE_LOCATION, NEAR),
      new Promise((resolve) => setTimeout(() => resolve('no-handler'), 300)),
    ]);
    expect(ack).toBe('no-handler');
  });

  it('delivers the live flow to the caller: offer, assignment, location + ETA, hospital accept, reservation', async () => {
    // Last fix 30 s ago: older than the 10 s server throttle, newer than the 120 s eligibility limit.
    const ambulance = await createAmbulance({ ...NEAR, locationAgeSeconds: 30 });
    const token = await book();
    const crewAgent = await loginAs(ambulance.email);
    const caller = open({ bookingToken: token });
    const crew = open({ cookie: crewAgent.cookieHeader });
    await Promise.all([connected(caller), connected(crew)]);
    const callerEvents = record(caller);
    const crewEvents = record(crew);

    // The ambulance page is told about the offer on its own room only.
    const offer = await AmbulanceOffer.findOne({ status: 'PENDING' });
    await crewAgent.get('/api/booking-offers'); // sanity: reachable
    expect(callerEvents.find((e) => e.event === SERVER_EVENTS.BOOKING_OFFER)).toBeUndefined();

    const accept = await crewAgent.post(`/api/booking-offers/${offer.id}/accept`);
    expect(accept.status).toBe(200);
    await waitForEvent(callerEvents, SERVER_EVENTS.BOOKING_UPDATED, (p) => p.status === 'AMBULANCE_ASSIGNED');

    // GPS over the socket → ON_THE_WAY and a live position with ETA/distance for the caller.
    const stored = await emitAck(crew, CLIENT_EVENTS.AMBULANCE_LOCATION, { lat: NEAR.lat + 0.005, lng: NEAR.lng });
    expect(stored).toEqual({ success: true, data: { stored: true } });
    await waitForEvent(callerEvents, SERVER_EVENTS.BOOKING_UPDATED, (p) => p.status === 'ON_THE_WAY');
    const position = await waitForEvent(callerEvents, SERVER_EVENTS.BOOKING_AMBULANCE_LOCATION);
    expect(position.location.lat).toBeCloseTo(NEAR.lat + 0.005, 6);
    expect(position.etaMinutes).toBeGreaterThan(0);
    expect(position.distanceKm).toBeGreaterThan(0);

    // Throttle: a second fix straight away is acknowledged but not stored or broadcast.
    const throttled = await emitAck(crew, CLIENT_EVENTS.AMBULANCE_LOCATION, NEAR);
    expect(throttled).toEqual({ success: true, data: { stored: false } });
    expect(callerEvents.filter((e) => e.event === SERVER_EVENTS.BOOKING_AMBULANCE_LOCATION)).toHaveLength(1);
    // Invalid positions are rejected by validation.
    expect((await emitAck(crew, CLIENT_EVENTS.AMBULANCE_LOCATION, { lat: 200, lng: 0 })).code).toBe('VALIDATION_ERROR');

    // The hospital accepts: the existing events reach the caller and the crew.
    const emergency = await EmergencyRequest.findOne();
    const hospitalOffer = await HospitalRequest.findOne({ emergencyId: emergency._id, status: 'PENDING' });
    const slug = Object.entries(seed.hospitals).find(([, h]) => h._id.equals(hospitalOffer.hospitalId))[0];
    const staff = await loginAs(`${slug}@bedlink.demo`);
    await staff.post(`/api/hospital-requests/${hospitalOffer.id}/accept`).expect(200);

    const accepted = await waitForEvent(callerEvents, SERVER_EVENTS.HOSPITAL_ACCEPTED);
    expect(accepted).toMatchObject({ hospitalId: hospitalOffer.hospitalId.toString() });
    const reservation = await waitForEvent(callerEvents, SERVER_EVENTS.RESERVATION_CREATED);
    expect(reservation.hospitalId).toBe(hospitalOffer.hospitalId.toString());
    await waitForEvent(crewEvents, SERVER_EVENTS.HOSPITAL_ACCEPTED);
    await waitForEvent(crewEvents, SERVER_EVENTS.RESERVATION_CREATED);

    // The caller's copy of emergency:updated carries the status only — no audit-log entry.
    const updates = callerEvents.filter((e) => e.event === SERVER_EVENTS.EMERGENCY_UPDATED);
    expect(updates.length).toBeGreaterThan(0);
    for (const { payload } of updates) {
      expect(payload.timelineEntry).toBeUndefined();
      expect(Object.keys(payload).sort()).toEqual(['currentHospital', 'emergencyId', 'status']);
    }
    // And the caller never saw the crew's private events.
    expect(callerEvents.some((e) => e.event === SERVER_EVENTS.EMERGENCY_CREATED)).toBe(false);
    expect(callerEvents.some((e) => e.event === SERVER_EVENTS.BOOKING_OFFER)).toBe(false);
  });

  it('the offered ambulance gets booking:offer on its own room, and booking:offer-cancelled on cancel', async () => {
    const ambulance = await createAmbulance(NEAR);
    const bystander = await createAmbulance({ lat: NEAR.lat + 0.2, lng: NEAR.lng });
    const crewAgent = await loginAs(ambulance.email);
    const otherAgent = await loginAs(bystander.email);
    const crew = open({ cookie: crewAgent.cookieHeader });
    const other = open({ cookie: otherAgent.cookieHeader });
    await Promise.all([connected(crew), connected(other)]);
    const crewEvents = record(crew);
    const otherEvents = record(other);

    const token = await book();
    const offered = await waitForEvent(crewEvents, SERVER_EVENTS.BOOKING_OFFER);
    expect(offered).toMatchObject({ condition: 'BREATHING', urgency: 'CRITICAL' });
    expect(new Date(offered.expiresAt) - new Date(offered.serverNow)).toBeGreaterThan(55_000);
    expect(JSON.stringify(offered)).not.toMatch(/Test Caller|98765/);

    await request().post(`/api/bookings/track/${token}/cancel`).expect(200);
    await waitForEvent(crewEvents, SERVER_EVENTS.BOOKING_OFFER_CANCELLED, (p) => p.offerId === offered.offerId);
    expect(otherEvents.some((e) => e.event === SERVER_EVENTS.BOOKING_OFFER)).toBe(false);
  });
});
