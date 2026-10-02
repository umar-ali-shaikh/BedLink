import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loginAs, request, resetDb, startTestDb, stopTestDb } from './helpers/testServer.js';

beforeAll(async () => {
  await startTestDb();
  await resetDb();
});
afterAll(stopTestDb);

describe('health', () => {
  it('GET /api/health is public', async () => {
    const res = await request().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('unknown routes return the standard 404 shape', async () => {
    const res = await request().get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: 'RESOURCE_NOT_FOUND' });
  });
});

describe('auth', () => {
  it.each([
    ['admin@bedlink.demo', 'ADMIN'],
    ['dispatcher1@bedlink.demo', 'DISPATCHER'],
    ['lakeside@bedlink.demo', 'HOSPITAL'],
  ])('%s logs in as %s with an HttpOnly cookie and no token in the body', async (email, role) => {
    const res = await request()
      .post('/api/auth/login')
      .send({
        email,
        password: email.startsWith('admin')
          ? 'Admin@123'
          : email.startsWith('dispatcher')
            ? 'Dispatch@123'
            : 'Hospital@123',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe(role);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/token/i);
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^bl_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('GET /auth/me returns the user and, for hospital staff, their hospital', async () => {
    const agent = await loginAs('lakeside@bedlink.demo');
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ role: 'HOSPITAL', hospital: { name: 'Lakeside Medical Centre' } });
  });

  it('wrong password and unknown email return the identical response', async () => {
    const wrong = await request().post('/api/auth/login').send({ email: 'admin@bedlink.demo', password: 'nope' });
    const unknown = await request().post('/api/auth/login').send({ email: 'ghost@bedlink.demo', password: 'nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('no cookie → 401 UNAUTHORIZED; tampered cookie → 401', async () => {
    expect((await request().get('/api/auth/me')).body.code).toBe('UNAUTHORIZED');
    const res = await request().get('/api/auth/me').set('Cookie', 'bl_token=not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('wrong role → 403 FORBIDDEN', async () => {
    const dispatcher = await loginAs('dispatcher1@bedlink.demo');
    const res = await dispatcher.get('/api/users');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('logout clears the cookie', async () => {
    const agent = await loginAs('dispatcher1@bedlink.demo');
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/bl_token=;/);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('a deactivated user is locked out immediately', async () => {
    const admin = await loginAs('admin@bedlink.demo');
    const staff = await loginAs('westbay@bedlink.demo');
    const me = await staff.get('/api/auth/me');
    await admin.patch(`/api/users/${me.body.data.user.id}`).send({ isActive: false }).expect(200);
    expect((await staff.get('/api/auth/me')).status).toBe(401);
  });

  it('validates login input', async () => {
    const res = await request().post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.map((d) => d.path)).toEqual(expect.arrayContaining(['body.email', 'body.password']));
  });
});

describe('users (admin)', () => {
  it('requires hospitalId for HOSPITAL users and rejects duplicates', async () => {
    const admin = await loginAs('admin@bedlink.demo');
    const missing = await admin
      .post('/api/users')
      .send({ name: 'New Nurse', email: 'nurse@bedlink.demo', password: 'Password1', role: 'HOSPITAL' });
    expect(missing.status).toBe(400);

    const created = await admin
      .post('/api/users')
      .send({ name: 'New Dispatcher', email: 'd3@bedlink.demo', password: 'Password1', role: 'DISPATCHER' });
    expect(created.status).toBe(201);
    expect(created.body.data.passwordHash).toBeUndefined();

    const dup = await admin
      .post('/api/users')
      .send({ name: 'Dup', email: 'd3@bedlink.demo', password: 'Password1', role: 'DISPATCHER' });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('DUPLICATE_RESOURCE');
  });

  it('rejects unknown fields', async () => {
    const admin = await loginAs('admin@bedlink.demo');
    const res = await admin
      .post('/api/users')
      .send({ name: 'X Y', email: 'x@bedlink.demo', password: 'Password1', role: 'DISPATCHER', isAdmin: true });
    expect(res.status).toBe(400);
  });
});
