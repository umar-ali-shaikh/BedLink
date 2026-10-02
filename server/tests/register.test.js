import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { run as hospitalsCli } from '../src/utils/hospitals.js';
import { setMailTransport } from '../src/services/mail/index.js';
import { setGoogleVerifier } from '../src/services/auth/google.js';
import { ICU_VENT_CARDIO, app, loginAs, request, resetDb, startTestDb, stopTestDb } from './helpers/testServer.js';

const outbox = [];
beforeAll(async () => {
  await startTestDb();
  await resetDb();
  setMailTransport((msg) => outbox.push(msg));
});
afterAll(async () => {
  setMailTransport(null);
  setGoogleVerifier(null);
  await stopTestDb();
});

/** Read the latest code mailed to `email` and confirm it. */
async function confirmEmail(agent, email) {
  const mail = [...outbox].reverse().find((m) => m.to === email);
  const code = mail.subject.match(/\d{6}/)[0];
  const res = await agent.post('/api/auth/email/verify').send({ code });
  expect(res.status).toBe(200);
}

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

describe('admin bootstrap', () => {
  it('ADMIN_EMAIL + ADMIN_PASSWORD create the admin, and reset the password when it exists', async () => {
    const { ensureAdmin } = await import('../src/services/auth/bootstrapAdmin.js');
    Object.assign(env, { ADMIN_EMAIL: 'ops@bedlink.test', ADMIN_PASSWORD: 'Very-Secret-123' });
    try {
      await ensureAdmin();
      const first = await request()
        .post('/api/auth/login')
        .send({ email: 'ops@bedlink.test', password: 'Very-Secret-123' });
      expect(first.body.data.user.role).toBe('ADMIN');
      env.ADMIN_PASSWORD = 'Rotated-Secret-456';
      await ensureAdmin();
      const old = await request()
        .post('/api/auth/login')
        .send({ email: 'ops@bedlink.test', password: 'Very-Secret-123' });
      expect(old.status).toBe(401);
      const rotated = await request()
        .post('/api/auth/login')
        .send({ email: 'ops@bedlink.test', password: 'Rotated-Secret-456' });
      expect(rotated.status).toBe(200);
    } finally {
      Object.assign(env, { ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined });
    }
  });

  it('a too-short ADMIN_PASSWORD is skipped, not fatal, and does not change the existing password', async () => {
    const { ensureAdmin } = await import('../src/services/auth/bootstrapAdmin.js');
    Object.assign(env, { ADMIN_EMAIL: 'admin@bedlink.demo', ADMIN_PASSWORD: 'short' });
    try {
      await expect(ensureAdmin()).resolves.toBeUndefined();
      const res = await request().post('/api/auth/login').send({ email: 'admin@bedlink.demo', password: 'Admin@123' });
      expect(res.status).toBe(200);
    } finally {
      Object.assign(env, { ADMIN_EMAIL: undefined, ADMIN_PASSWORD: undefined });
    }
  });
});

describe('ambulance registration', () => {
  it('creates a PENDING DISPATCHER account that is signed in but cannot request beds yet', async () => {
    const agent = supertest.agent(app);
    const res = await agent.post('/api/auth/register/ambulance').send(ambulance());
    expect(res.status).toBe(201);
    expect(res.headers['set-cookie'][0]).toMatch(/^bl_token=/);
    expect(res.body.data.user).toMatchObject({
      role: 'DISPATCHER',
      verificationStatus: 'PENDING',
      ambulance: { vehicleNumber: 'MH01AB1234', ambulanceType: 'ALS' },
    });

    const unconfirmed = await agent.post('/api/emergencies').send(ICU_VENT_CARDIO);
    expect(unconfirmed.body.code).toBe('EMAIL_NOT_VERIFIED');
    await confirmEmail(agent, 'ravi@ambulance.test');

    const blocked = await agent.post('/api/emergencies').send(ICU_VENT_CARDIO);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('ACCOUNT_NOT_VERIFIED');

    const admin = await loginAs('admin@bedlink.demo');
    const queue = await admin.get('/api/admin/verifications/ambulances');
    const mine = queue.body.data.find((u) => u.email === 'ravi@ambulance.test');
    expect(mine).toMatchObject({ verificationStatus: 'PENDING' });
    expect(mine.passwordHash).toBeUndefined();

    const decided = await admin
      .post(`/api/admin/verifications/ambulances/${mine.id}`)
      .send({ decision: 'VERIFY', note: 'RC checked' });
    expect(decided.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.body.data.user.verificationStatus).toBe('VERIFIED');
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
    expect(user.emailVerified).toBe(false);
    await confirmEmail(hospitalAgent, 'meera@seaside.test');
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

  it('admin panel API: summary, queue, reject needs a reason, non-admins are refused', async () => {
    const admin = await loginAs('admin@bedlink.demo');
    const summary = await admin.get('/api/admin/verifications/summary');
    expect(summary.body.data.hospitals.PENDING).toBeGreaterThanOrEqual(1);
    const queue = await admin.get('/api/admin/verifications/hospitals?status=PENDING');
    const pending = queue.body.data.find((h) => h.id === hospitalId);
    expect(pending.staff[0].email).toBe('meera@seaside.test');

    const noReason = await admin.post(`/api/admin/verifications/hospitals/${hospitalId}`).send({ decision: 'REJECT' });
    expect(noReason.status).toBe(400);

    const dispatcher = await loginAs('dispatcher1@bedlink.demo');
    expect((await dispatcher.get('/api/admin/verifications/hospitals')).status).toBe(403);
    expect((await hospitalAgent.get('/api/admin/verifications/summary')).status).toBe(403);
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

describe('email verification', () => {
  it('blocks the panel until the emailed code is entered; wrong codes count down; resend has a cooldown', async () => {
    const agent = supertest.agent(app);
    await agent
      .post('/api/auth/register/ambulance')
      .send(ambulance({ email: 'code@x.test', vehicleNumber: 'MH04CD1111' }));
    const mail = outbox.find((m) => m.to === 'code@x.test');
    expect(mail.subject).toMatch(/^\d{6} is your BedLink verification code$/);
    expect(mail.text).not.toMatch(/password/i);

    expect((await agent.get('/api/hospitals')).body.code).toBe('EMAIL_NOT_VERIFIED');
    const wrong = await agent
      .post('/api/auth/email/verify')
      .send({ code: '000000' === mail.subject.slice(0, 6) ? '111111' : '000000' });
    expect(wrong.body.code).toBe('EMAIL_CODE_INVALID');
    expect((await agent.post('/api/auth/email/send')).body.code).toBe('EMAIL_CODE_COOLDOWN');

    await confirmEmail(agent, 'code@x.test');
    expect((await agent.get('/api/auth/me')).body.data.user.emailVerified).toBe(true);
    expect((await agent.get('/api/hospitals')).status).toBe(200);
  });

  it('EMAIL_VERIFICATION=off skips the code', async () => {
    env.EMAIL_VERIFICATION = 'off';
    try {
      const res = await request()
        .post('/api/auth/register/ambulance')
        .send(ambulance({ email: 'off@x.test', vehicleNumber: 'MH04CD2222' }));
      expect(res.body.data.user.emailVerified).toBe(true);
    } finally {
      env.EMAIL_VERIFICATION = 'required';
    }
  });
});

describe('Google sign-in', () => {
  const token = (email, sub = `g-${email}`) =>
    JSON.stringify({ sub, email, email_verified: true, name: 'Google User' });
  beforeAll(() => setGoogleVerifier(async (credential) => JSON.parse(credential)));

  it('exposes the config the login page needs', async () => {
    const res = await request().get('/api/auth/config');
    expect(res.body.data).toMatchObject({ emailVerification: 'required', registrationEnabled: true });
  });

  it('unknown Google email → GOOGLE_ACCOUNT_NOT_FOUND with the email to prefill', async () => {
    const res = await request()
      .post('/api/auth/google')
      .send({ credential: token('new@gmail.test') });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('GOOGLE_ACCOUNT_NOT_FOUND');
    expect(res.body.details[0]).toEqual({ path: 'email', message: 'new@gmail.test' });
  });

  it('registers with Google (no password, email already verified) and signs in again with Google', async () => {
    const agent = supertest.agent(app);
    const reg = await agent
      .post('/api/auth/register/ambulance')
      .send(
        ambulance({
          email: 'new@gmail.test',
          vehicleNumber: 'MH04CD3333',
          password: undefined,
          googleCredential: token('new@gmail.test'),
        })
      );
    expect(reg.status).toBe(201);
    expect(reg.body.data.user.emailVerified).toBe(true);

    const login = await request()
      .post('/api/auth/google')
      .send({ credential: token('new@gmail.test') });
    expect(login.status).toBe(200);
    expect(login.headers['set-cookie'][0]).toMatch(/^bl_token=/);
  });

  it('refuses a Google token for a different email than the form', async () => {
    const res = await request()
      .post('/api/auth/register/ambulance')
      .send(
        ambulance({
          email: 'typed@x.test',
          vehicleNumber: 'MH04CD4444',
          password: undefined,
          googleCredential: token('other@gmail.test'),
        })
      );
    expect(res.status).toBe(400);
    expect(res.body.details[0].path).toBe('email');
  });

  it('links Google to an existing email account and verifies its email', async () => {
    const res = await request()
      .post('/api/auth/google')
      .send({ credential: token('lakeside@bedlink.demo') });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('HOSPITAL');
  });

  it('needs a password or Google credential to register', async () => {
    const res = await request()
      .post('/api/auth/register/ambulance')
      .send(ambulance({ email: 'nopw@x.test', vehicleNumber: 'MH04CD5555', password: undefined }));
    expect(res.status).toBe(400);
  });
});
