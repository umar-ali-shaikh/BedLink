import http from 'node:http';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import supertest from 'supertest';
import { createApp } from '../../src/app.js';
import { connectDB, disconnectDB, ensureIndexes } from '../../src/config/db.js';
import { DEMO_PASSWORDS } from '../fixtures/seedData.js';
import '../../src/models/index.js';
import { clearAllOfferTimeouts } from '../../src/services/emergency/index.js';
import { createSocketServer } from '../../src/sockets/index.js';
import { seedDatabase } from '../fixtures/seed.js';

export const PATIENT = { lat: 19.076, lng: 72.8777 };
export const ICU_VENT_CARDIO = {
  patientLocation: PATIENT,
  requirements: { bedType: 'ICU', equipment: ['VENTILATOR'], specialties: ['CARDIOLOGY'] },
  urgency: 'CRITICAL',
};

let replSet;
export const app = createApp();

/** Single-node replica set (transactions need one). Set MONGOMS_SYSTEM_BINARY to reuse a local mongod. */
export async function startTestDb() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await connectDB(replSet.getUri('bedlink-test'));
  await ensureIndexes();
}

export async function stopTestDb() {
  clearAllOfferTimeouts();
  await disconnectDB();
  await replSet?.stop();
}

export async function resetDb() {
  clearAllOfferTimeouts();
  return seedDatabase();
}

export const passwordFor = (email) => {
  if (email.startsWith('admin')) return DEMO_PASSWORDS.ADMIN;
  if (email.startsWith('dispatcher')) return DEMO_PASSWORDS.DISPATCHER;
  return DEMO_PASSWORDS.HOSPITAL;
};

/** Supertest agent that keeps the `bl_token` cookie. */
export async function loginAs(email) {
  const agent = supertest.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password: passwordFor(email) });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  agent.cookieHeader = res.headers['set-cookie'][0].split(';')[0];
  return agent;
}

export const request = () => supertest(app);

/** Real HTTP + Socket.IO server on a random port (socket tests). */
export async function startHttpServer() {
  const server = http.createServer(app);
  const io = createSocketServer(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    close: async () => {
      io.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll `fn` until it returns a truthy value or the timeout passes. */
export async function waitFor(fn, { timeout = 5000, interval = 50 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await sleep(interval);
  }
}
