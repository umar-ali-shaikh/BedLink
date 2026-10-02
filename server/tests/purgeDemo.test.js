import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { Bed, EmergencyRequest, Hospital, User } from '../src/models/index.js';
import { purgeDemoData } from '../src/utils/purgeDemo.js';
import { ICU_VENT_CARDIO, loginAs, request, resetDb, startTestDb, stopTestDb } from './helpers/testServer.js';

beforeAll(async () => {
  await startTestDb();
  await resetDb();
});
afterAll(stopTestDb);

describe('purgeDemoData', () => {
  it('removes the seeded demo data and keeps real registrations', async () => {
    // Demo activity: an emergency by a demo ambulance.
    const demo = await loginAs('dispatcher1@bedlink.demo');
    expect((await demo.post('/api/emergencies').send(ICU_VENT_CARDIO)).status).toBe(201);

    // Real sign-ups.
    const real = await request()
      .post('/api/auth/register/hospital')
      .send({
        hospital: {
          name: 'Real Care Hospital',
          address: 'Real Road, Pune 411001',
          coordinates: { lat: 18.52, lng: 73.85 },
          specialties: [],
          registrationNumber: 'MH/PU/2025/0001',
          phone: '9876500000',
          email: 'info@realcare.test',
        },
        contact: { name: 'Real Person', email: 'real@realcare.test', password: 'RealPass1' },
      });
    expect(real.status).toBe(201);
    await request().post('/api/auth/register/ambulance').send({
      name: 'Real Driver',
      email: 'driver@real.test',
      password: 'RealPass1',
      phone: '9876511111',
      vehicleNumber: 'MH12AB1234',
      ambulanceType: 'BLS',
    });

    const counts = await purgeDemoData();
    expect(counts.hospitals).toBe(12);
    expect(counts.emergencies).toBe(1);

    expect(await Hospital.countDocuments()).toBe(1);
    expect(await Hospital.exists({ name: 'Real Care Hospital' })).toBeTruthy();
    expect(await Bed.countDocuments()).toBe(0);
    expect(await EmergencyRequest.countDocuments()).toBe(0);
    const emails = (await User.find().select('email')).map((u) => u.email).sort();
    // Demo admin is kept because no real ADMIN_EMAIL is configured.
    expect(emails).toEqual(['admin@bedlink.demo', 'driver@real.test', 'real@realcare.test']);

    // Idempotent.
    expect(await purgeDemoData()).toEqual({ users: 0, hospitals: 0 });
  });

  it('also removes the demo admin once a real ADMIN_EMAIL is configured', async () => {
    env.ADMIN_EMAIL = 'ops@real.test';
    try {
      await purgeDemoData();
      expect(await User.exists({ email: 'admin@bedlink.demo' })).toBeFalsy();
    } finally {
      env.ADMIN_EMAIL = undefined;
    }
  });
});

describe('geocode', () => {
  it('searches places through the geocoder (normalised + cached) and reverse-looks-up', async () => {
    const { setGeocoder } = await import('../src/services/geocode/index.js');
    let calls = 0;
    setGeocoder(async (kind, params) => {
      calls += 1;
      if (kind === 'search') return [{ display_name: `Result for ${params.q}`, lat: '18.5204', lon: '73.8567' }];
      return { display_name: 'Shivajinagar, Pune' };
    });
    try {
      const first = await request().get('/api/geocode/search').query({ q: 'Ruby Hall Pune' });
      expect(first.body.data).toEqual([{ label: 'Result for Ruby Hall Pune', lat: 18.5204, lng: 73.8567 }]);
      await request().get('/api/geocode/search').query({ q: 'ruby hall pune' });
      expect(calls).toBe(1);
      expect((await request().get('/api/geocode/search').query({ q: 'ab' })).status).toBe(400);
      const rev = await request().get('/api/geocode/reverse').query({ lat: 18.53, lng: 73.85 });
      expect(rev.body.data.label).toBe('Shivajinagar, Pune');
      setGeocoder(async () => {
        throw new Error('down');
      });
      expect((await request().get('/api/geocode/search').query({ q: 'anything' })).body.code).toBe(
        'GEOCODER_UNAVAILABLE'
      );
    } finally {
      setGeocoder(null);
    }
  });
});
