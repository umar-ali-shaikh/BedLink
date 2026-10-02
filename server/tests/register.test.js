import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { run as hospitalsCli } from '../src/utils/hospitals.js';
import { ICU_VENT_CARDIO, app, loginAs, request, resetDb, startTestDb, stopTestDb } from './helpers/testServer.js';

beforeAll(async () => {
  await startTestDb();
  await resetDb();
});
afterAll(stopTestDb);

const ambulance = (over = {}) => ({
  name: 'Ravi Kumar',
  email: 'ravi@ambulance.test',
  password: 'Ambulance1',
  phone: '+91 98765 43210',
  vehicleNumber: 'mh 01 ab 1234',
  ambulanceType: 'ALS',
  organization: '108 Service',
  ...over,
});

const hospitalBody = (over = {}, contact = {}) => ({
  hospital: {
    name: 'Seaside Care Hospital',
    address: 'Marine Drive, Mumbai',
    coordinates: { lat: 19.08, lng: 72.88 },
    specialties: ['CARDIOLOGY', 'GENERAL_MEDICINE'],
    registrationNumber: 'mh/ce/2024/00123',
    hfrId: 'IN2710000123',
    phone: '9876501234',
    email: 'info@seaside.test',
    ...over,
  },
  contact: { name: 'Dr Meera Shah', email: 'meera@seaside.test', password: 'Hospital9', ...contact },
});

describe('ambulance registration', () => {
  it('creates an active DISPATCHER account, signs it in and normalises the vehicle number', async () => {
    const agent = supertest.agent(app);
    const res = await agent.post('/api/auth/register/ambulance').send(ambulance());
    expect(res.status).toBe(201);
    expect(res.headers['set-cookie'][0]).toMatch(/^bl_token=/);
    expect(res.body.data.user).toMatchObject({
      role: 'DISPATCHER',
      ambulance: { vehicleNumber: 'MH01AB1234', ambulanceType: 'ALS' },
    });

    const me = await agent.get('/api/auth/me');
    expect(me.body.data.user.ambulance.vehicleNumber).toBe('MH01AB1234');
    const created = await agent.post('/api/emergencies').send(ICU_VENT_CARDIO);
    expect(created.status).toBe(201);
  });

  it('rejects a duplicate email or vehicle with a field-level 409', async () => {
    const email = await request()
      .post('/api/auth/register/ambulance')
      .send(ambulance({ vehicleNumber: 'MH02CD5678' }));
    expect(email.status).toBe(409);
    expect(email.body.details[0].path).toBe('email');

    const vehicle = await request()
      .post('/api/auth/register/ambulance')
      .send(ambulance({ email: 'other@ambulance.test' }));
    expect(vehicle.status).toBe(409);
    expect(vehicle.body.details[0].path).toBe('vehicleNumber');
  });

  it.each([
    ['vehicleNumber', { vehicleNumber: 'ABC' }],
    ['phone', { phone: '12345' }],
    ['password', { password: 'password' }],
    ['ambulanceType', { ambulanceType: 'HELICOPTER' }],
  ])('validates %s', async (field, over) => {
    const res = await request()
      .post('/api/auth/register/ambulance')
      .send(ambulance({ email: 'v@ambulance.test', ...over }));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.some((d) => d.path.includes(field))).toBe(true);
  });
});

describe('hospital registration and verification', () => {
  let hospitalAgent;
  let hospitalId;

  it('creates a PENDING, inactive hospital and signs in its contact person', async () => {
    hospitalAgent = supertest.agent(app);
    const res = await hospitalAgent.post('/api/auth/register/hospital').send(hospitalBody());
    expect(res.status).toBe(201);
    const { user } = res.body.data;
    expect(user.role).toBe('HOSPITAL');
    expect(user.hospital).toMatchObject({
      verificationStatus: 'PENDING',
      status: 'INACTIVE',
      registrationNumber: 'MH/CE/2024/00123',
    });
    hospitalId = user.hospital.id;
  });

  it('lets the pending hospital set up its beds', async () => {
    const res = await hospitalAgent
      .post(`/api/hospitals/${hospitalId}/beds`)
      .send({ label: 'ICU-01', type: 'ICU', equipment: ['VENTILATOR'], status: 'AVAILABLE' });
    expect(res.status).toBe(201);
    const other = await hospitalAgent
      .post('/api/hospitals/000000000000000000000001/beds')
      .send({ label: 'X-1', type: 'ICU' });
    expect(other.status).toBe(403);
  });

  it('keeps unverified hospitals out of ambulance lists and matching', async () => {
    const dispatcher = await loginAs('dispatcher1@bedlink.demo');
    const list = await dispatcher.get('/api/hospitals');
    expect(list.body.data.some((h) => h.id === hospitalId)).toBe(false);
    const match = await dispatcher.post('/api/emergencies').send(ICU_VENT_CARDIO);
    const ids = [...match.body.data.candidates, ...match.body.data.exclusions].map((c) => c.hospitalId);
    expect(ids).not.toContain(hospitalId);
  });

  it('runs automatic checks: duplicate registration number, same name nearby, bad HFR ID', async () => {
    const dupReg = await request()
      .post('/api/auth/register/hospital')
      .send(hospitalBody({ name: 'Other Hospital', hfrId: undefined }, { email: 'a@x.test' }));
    expect(dupReg.status).toBe(409);
    expect(dupReg.body.details[0].path).toBe('hospital.registrationNumber');

    const twin = await request()
      .post('/api/auth/register/hospital')
      .send(
        hospitalBody(
          { name: 'seaside care hospital', registrationNumber: 'MH/CE/2024/99999', hfrId: undefined },
          { email: 'b@x.test' }
        )
      );
    expect(twin.status).toBe(409);
    expect(twin.body.details[0].path).toBe('hospital.name');

    const badHfr = await request()
      .post('/api/auth/register/hospital')
      .send(
        hospitalBody(
          { name: 'Third Hospital', registrationNumber: 'MH/CE/2024/77777', hfrId: 'HFR123' },
          { email: 'c@x.test' }
        )
      );
    expect(badHfr.status).toBe(400);
  });

  it('becomes visible to ambulances after `npm run hospitals -- verify`', async () => {
    await hospitalsCli(['verify', 'MH/CE/2024/00123', 'Checked with state register']);
    const me = await hospitalAgent.get('/api/auth/me');
    expect(me.body.data.user.hospital).toMatchObject({ verificationStatus: 'VERIFIED', status: 'ACTIVE' });
    const dispatcher = await loginAs('dispatcher1@bedlink.demo');
    const list = await dispatcher.get('/api/hospitals');
    expect(list.body.data.some((h) => h.id === hospitalId)).toBe(true);
  });

  it('rejecting hides it again and keeps the reason for the hospital', async () => {
    await hospitalsCli(['reject', hospitalId, 'Registration', 'number', 'not', 'found']);
    const me = await hospitalAgent.get('/api/auth/me');
    expect(me.body.data.user.hospital).toMatchObject({
      verificationStatus: 'REJECTED',
      verificationNote: 'Registration number not found',
    });
  });

  it('HOSPITAL_AUTO_VERIFY=true verifies immediately', async () => {
    env.HOSPITAL_AUTO_VERIFY = true;
    try {
      const res = await request()
        .post('/api/auth/register/hospital')
        .send(
          hospitalBody(
            { name: 'Auto Hospital', registrationNumber: 'MH/CE/2024/55555', hfrId: undefined },
            { email: 'auto@x.test' }
          )
        );
      expect(res.status).toBe(201);
      expect(res.body.data.user.hospital).toMatchObject({ verificationStatus: 'VERIFIED', status: 'ACTIVE' });
    } finally {
      env.HOSPITAL_AUTO_VERIFY = false;
    }
  });

  it('REGISTRATION_ENABLED=false closes both forms', async () => {
    env.REGISTRATION_ENABLED = false;
    try {
      const res = await request()
        .post('/api/auth/register/ambulance')
        .send(ambulance({ email: 'closed@x.test', vehicleNumber: 'MH09ZZ9999' }));
      expect(res.status).toBe(403);
    } finally {
      env.REGISTRATION_ENABLED = true;
    }
  });
});
