import { io as connect } from 'socket.io-client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../src/constants/socketEvents.js';
import { Bed, HospitalRequest } from '../src/models/index.js';
import { ICU_VENT_CARDIO, loginAs, resetDb, startHttpServer, startTestDb, stopTestDb } from './helpers/testServer.js';

let server;
let seed;
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

function open(cookie) {
  const socket = connect(server.url, {
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
    extraHeaders: cookie ? { Cookie: cookie } : {},
  });
  sockets.push(socket);
  return socket;
}

const once = (socket, event, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event} within ${timeout}ms`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const connected = (socket) =>
  new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });

const emitAck = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

describe('socket.io', () => {
  it('refuses unauthenticated connections', async () => {
    const socket = open();
    await expect(connected(socket)).rejects.toThrow('UNAUTHORIZED');
  });

  it('hospital receives hospital:request live; dispatcher gets emergency + bed updates', async () => {
    const dispatcher = await loginAs('dispatcher1@bedlink.demo');
    const lakeside = await loginAs('lakeside@bedlink.demo');
    const city = await loginAs('citygeneral@bedlink.demo');

    const dSocket = open(dispatcher.cookieHeader);
    const lSocket = open(lakeside.cookieHeader);
    const cSocket = open(city.cookieHeader);
    await Promise.all([connected(dSocket), connected(lSocket), connected(cSocket)]);

    let cityGotRequest = false;
    cSocket.on(SERVER_EVENTS.HOSPITAL_REQUEST, () => {
      cityGotRequest = true;
    });

    const created = once(dSocket, SERVER_EVENTS.EMERGENCY_CREATED);
    const e = (await dispatcher.post('/api/emergencies').send(ICU_VENT_CARDIO)).body.data;
    expect((await created).emergency.id).toBe(e.id);

    // Follow the emergency room explicitly (authorised in the handler).
    expect(await emitAck(dSocket, CLIENT_EVENTS.JOIN_DISPATCHER, { emergencyId: e.id })).toMatchObject({
      success: true,
    });

    const incoming = once(lSocket, SERVER_EVENTS.HOSPITAL_REQUEST);
    const updated = once(dSocket, SERVER_EVENTS.EMERGENCY_UPDATED);
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const payload = await incoming;
    expect(payload).toMatchObject({ emergencyId: e.id, urgency: 'CRITICAL', etaMinutes: 8 });
    expect(new Date(payload.expiresAt) - new Date(payload.serverNow)).toBeGreaterThan(115_000);
    expect((await updated).status).toBe('AWAITING_HOSPITAL');
    expect(cityGotRequest).toBe(false);

    // Accept over the optional socket mutation (same service as REST).
    const accepted = once(dSocket, SERVER_EVENTS.HOSPITAL_ACCEPTED);
    const reserved = once(dSocket, SERVER_EVENTS.RESERVATION_CREATED);
    const bedUpdate = once(dSocket, SERVER_EVENTS.BED_UPDATED);
    const ack = await emitAck(lSocket, CLIENT_EVENTS.HOSPITAL_RESPOND, {
      hospitalRequestId: payload.hospitalRequestId,
      action: 'ACCEPT',
    });
    expect(ack.success).toBe(true);
    expect((await accepted).hospitalRequestId).toBe(payload.hospitalRequestId);
    expect((await reserved).bedLabel).toMatch(/^ICU-/);
    expect((await bedUpdate).summary.byStatus.RESERVED).toBe(1);
  });

  it('hospital:request-cancelled reaches the hospital when the dispatcher cancels', async () => {
    const dispatcher = await loginAs('dispatcher1@bedlink.demo');
    const lakeside = await loginAs('lakeside@bedlink.demo');
    const lSocket = open(lakeside.cookieHeader);
    await connected(lSocket);

    const e = (await dispatcher.post('/api/emergencies').send(ICU_VENT_CARDIO)).body.data;
    await dispatcher.post(`/api/emergencies/${e.id}/request-hospital`);
    const offer = await HospitalRequest.findOne({ emergencyId: e.id, status: 'PENDING' });

    const cancelled = once(lSocket, SERVER_EVENTS.HOSPITAL_REQUEST_CANCELLED);
    await dispatcher.post(`/api/emergencies/${e.id}/cancel`);
    expect((await cancelled).hospitalRequestId).toBe(offer.id);
  });

  it('bed updates are broadcast to dispatchers and admins', async () => {
    const admin = await loginAs('admin@bedlink.demo');
    const lakeside = await loginAs('lakeside@bedlink.demo');
    const aSocket = open(admin.cookieHeader);
    await connected(aSocket);

    const bed = await Bed.findOne({ hospitalId: seed.hospitals.lakeside._id, status: 'AVAILABLE' });
    const update = once(aSocket, SERVER_EVENTS.BED_UPDATED);
    await lakeside.patch(`/api/beds/${bed.id}`).send({ status: 'OCCUPIED' });
    expect(await update).toMatchObject({ bedId: bed.id, status: 'OCCUPIED', hospitalId: seed.hospitals.lakeside.id });
  });

  it('cannot follow another dispatcher’s emergency room', async () => {
    const owner = await loginAs('dispatcher1@bedlink.demo');
    const other = await loginAs('dispatcher2@bedlink.demo');
    const e = (await owner.post('/api/emergencies').send(ICU_VENT_CARDIO)).body.data;
    const socket = open(other.cookieHeader);
    await connected(socket);
    expect(await emitAck(socket, CLIENT_EVENTS.JOIN_DISPATCHER, { emergencyId: e.id })).toMatchObject({
      success: false,
      code: 'FORBIDDEN',
    });
    expect(await emitAck(socket, CLIENT_EVENTS.HOSPITAL_RESPOND, {})).toMatchObject({
      success: false,
      code: 'FORBIDDEN',
    });
  });
});
