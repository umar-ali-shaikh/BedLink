import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Bed } from '../src/models/index.js';
import { loginAs, PATIENT, resetDb, startTestDb, stopTestDb } from './helpers/testServer.js';

let seed;
beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(async () => {
  seed = await resetDb();
});

const idOf = (slug) => seed.hospitals[slug]._id.toString();

describe('hospitals', () => {
  it('lists hospitals with bed summaries and freshness', async () => {
    const dispatcher = await loginAs('dispatcher1@bedlink.demo');
    const res = await dispatcher.get('/api/hospitals');
    expect(res.status).toBe(200);
    const lakeside = res.body.data.find((h) => h.name === 'Lakeside Medical Centre');
    expect(lakeside.coordinates).toEqual({ lat: 19.1, lng: 72.89 });
    expect(lakeside.location).toBeUndefined();
    expect(lakeside.bedSummary.available).toEqual({ ICU: 3, VENTILATOR: 3, OXYGEN: 6, CARDIAC: 1, BURNS: 0 });
    expect(lakeside.bedSummary.freshness).toBe('FRESH');
    const greenfield = res.body.data.find((h) => h.name === 'Greenfield Care Hospital');
    expect(greenfield.bedSummary.freshness).toBe('STALE');
  });

  it('nearby is sorted by distance and carries ETA', async () => {
    const dispatcher = await loginAs('dispatcher1@bedlink.demo');
    const res = await dispatcher.get('/api/hospitals/nearby').query({ ...PATIENT, radiusKm: 10 });
    expect(res.status).toBe(200);
    const distances = res.body.data.map((h) => h.straightLineKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(res.body.data[0]).toHaveProperty('etaMinutes');
    expect(res.body.data.some((h) => h.name === 'Far Coast Hospital')).toBe(false);
  });

  it('hospital staff can only read their own hospital', async () => {
    const staff = await loginAs('lakeside@bedlink.demo');
    expect((await staff.get(`/api/hospitals/${idOf('lakeside')}`)).status).toBe(200);
    expect((await staff.get(`/api/hospitals/${idOf('citygeneral')}`)).status).toBe(403);
    expect((await staff.get('/api/hospitals')).status).toBe(403);
  });

  it('hospital staff may update only currentLoad', async () => {
    const staff = await loginAs('lakeside@bedlink.demo');
    const ok = await staff.patch(`/api/hospitals/${idOf('lakeside')}`).send({ currentLoad: 80 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.currentLoad).toBe(80);
    expect((await staff.patch(`/api/hospitals/${idOf('lakeside')}`).send({ name: 'Mine' })).status).toBe(403);
    expect((await staff.patch(`/api/hospitals/${idOf('citygeneral')}`).send({ currentLoad: 10 })).status).toBe(403);
  });

  it('admin creates a hospital and adds beds', async () => {
    const admin = await loginAs('admin@bedlink.demo');
    const created = await admin
      .post('/api/hospitals')
      .send({ name: 'Test Hospital', coordinates: { lat: 19.0, lng: 72.8 }, specialties: ['TRAUMA'] });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const bed = await admin
      .post(`/api/hospitals/${id}/beds`)
      .send({ label: 'ICU-01', type: 'ICU', equipment: ['VENTILATOR'] });
    expect(bed.status).toBe(201);
    const dup = await admin.post(`/api/hospitals/${id}/beds`).send({ label: 'ICU-01', type: 'ICU' });
    expect(dup.status).toBe(409);
    const reserved = await admin
      .post(`/api/hospitals/${id}/beds`)
      .send({ label: 'ICU-02', type: 'ICU', status: 'RESERVED' });
    expect(reserved.status).toBe(400);
  });

  it('rejects invalid coordinates with field details', async () => {
    const admin = await loginAs('admin@bedlink.demo');
    const res = await admin.post('/api/hospitals').send({ name: 'Bad', coordinates: { lat: 200, lng: 72 } });
    expect(res.status).toBe(400);
    expect(res.body.details[0].path).toBe('body.coordinates.lat');
  });
});

describe('beds', () => {
  it('staff changes a bed status in one call; updatedAt refreshes', async () => {
    const staff = await loginAs('lakeside@bedlink.demo');
    const beds = (await staff.get(`/api/hospitals/${idOf('lakeside')}/beds`)).body.data;
    const target = beds.find((b) => b.status === 'AVAILABLE');
    const res = await staff.patch(`/api/beds/${target.id}`).send({ status: 'OCCUPIED' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('OCCUPIED');
    expect(new Date(res.body.data.updatedAt) > new Date(target.updatedAt)).toBe(true);
    expect(res.body.data.lastUpdatedBy).toBeTruthy();
  });

  it("can't read or update another hospital's beds", async () => {
    const staff = await loginAs('lakeside@bedlink.demo');
    expect((await staff.get(`/api/hospitals/${idOf('citygeneral')}/beds`)).status).toBe(403);
    const other = await Bed.findOne({ hospitalId: idOf('citygeneral') });
    expect((await staff.patch(`/api/beds/${other._id}`).send({ status: 'CLEANING' })).status).toBe(403);
  });

  it('PATCH on a RESERVED bed → 409 INVALID_STATE_TRANSITION; setting RESERVED → 400', async () => {
    const staff = await loginAs('lakeside@bedlink.demo');
    const bed = await Bed.findOneAndUpdate(
      { hospitalId: idOf('lakeside'), status: 'AVAILABLE' },
      { status: 'RESERVED' },
      { returnDocument: 'after' }
    );
    const res = await staff.patch(`/api/beds/${bed._id}`).send({ status: 'AVAILABLE' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_STATE_TRANSITION');

    const other = await Bed.findOne({ hospitalId: idOf('lakeside'), status: 'AVAILABLE' });
    const sneaky = await staff.patch(`/api/beds/${other._id}`).send({ status: 'RESERVED' });
    expect(sneaky.status).toBe(400);
  });

  it('Confirm all refreshes freshness of non-reserved beds without changing status', async () => {
    const staff = await loginAs('greenfield@bedlink.demo');
    const id = idOf('greenfield');
    const reserved = await Bed.findOneAndUpdate(
      { hospitalId: id, status: 'OCCUPIED' },
      { status: 'RESERVED' },
      { returnDocument: 'after', timestamps: false }
    );
    const before = await Bed.find({ hospitalId: id }).lean();

    const res = await staff.post(`/api/hospitals/${id}/beds/confirm`);
    expect(res.status).toBe(200);
    expect(res.body.data.confirmed).toBe(before.length - 1);
    expect(res.body.data.summary.freshness).toBe('FRESH');

    const after = await Bed.find({ hospitalId: id }).lean();
    for (const b of after) {
      const old = before.find((x) => x._id.equals(b._id));
      expect(b.status).toBe(old.status);
      if (b._id.equals(reserved._id)) expect(b.updatedAt).toEqual(old.updatedAt);
      else expect(b.updatedAt > old.updatedAt).toBe(true);
    }
  });
});
