import { describe, expect, it } from 'vitest';
import { computeConfidence } from '../confidence.js';
import { estimate } from '../eta.js';
import { evaluateHospital } from '../filter.js';
import { freshnessOf, freshnessTier } from '../freshness.js';
import { compareCandidates, rankHospitals } from '../rank.js';
import { computeScore } from '../score.js';

const NOW = new Date('2026-10-02T10:00:00.000Z');
const CONFIG = {
  freshSeconds: 120,
  recentSeconds: 600,
  maxEtaMinutes: 60,
  maxRadiusKm: 50,
  criticalLoad: 95,
  timeoutWindowMinutes: 30,
  avgSpeedKmph: 30,
  roadFactor: 1.3,
};
const PATIENT = { lat: 19.076, lng: 72.8777 };
const REQ = { bedType: 'ICU', equipment: ['VENTILATOR'], specialties: ['CARDIOLOGY'] };

const secondsAgo = (s) => new Date(NOW.getTime() - s * 1000);
const bed = (overrides = {}) => ({
  type: 'ICU',
  status: 'AVAILABLE',
  equipment: ['VENTILATOR', 'OXYGEN'],
  updatedAt: secondsAgo(30),
  ...overrides,
});
const hospital = (id, overrides = {}) => ({
  id,
  name: `Hospital ${id}`,
  coordinates: PATIENT,
  specialties: ['CARDIOLOGY'],
  currentLoad: 50,
  status: 'ACTIVE',
  ...overrides,
});

describe('eta.estimate', () => {
  it('applies road factor and speed, rounding up minutes', () => {
    const { distanceKm, etaMinutes } = estimate(PATIENT, { lat: 19.1, lng: 72.89 }, CONFIG);
    // haversine ≈ 2.97 km × 1.3 ≈ 3.86 km → 3.86 / 30 × 60 = 7.7 → 8 min
    expect(distanceKm).toBe(3.9);
    expect(etaMinutes).toBe(8);
  });

  it('never returns less than one minute', () => {
    expect(estimate(PATIENT, PATIENT, CONFIG).etaMinutes).toBe(1);
  });
});

describe('freshness', () => {
  it('classifies tiers at the boundaries', () => {
    expect(freshnessTier(0, CONFIG)).toBe('FRESH');
    expect(freshnessTier(120, CONFIG)).toBe('FRESH');
    expect(freshnessTier(121, CONFIG)).toBe('RECENT');
    expect(freshnessTier(600, CONFIG)).toBe('RECENT');
    expect(freshnessTier(601, CONFIG)).toBe('STALE');
    expect(freshnessTier(null, CONFIG)).toBe('STALE');
  });

  it('uses the most recent updatedAt among the beds', () => {
    const result = freshnessOf([bed({ updatedAt: secondsAgo(900) }), bed({ updatedAt: secondsAgo(45) })], NOW, CONFIG);
    expect(result).toMatchObject({ tier: 'FRESH', ageSeconds: 45 });
  });
});

describe('computeScore (hand-calculated)', () => {
  it('3 beds, 8 min, FRESH, 55% load → 91', () => {
    // 0.5·1 + 0.25·(1 − 8/60) + 0.15·1 + 0.1·0.45 = 0.9117
    const { score, breakdown } = computeScore(
      { matchingBedCount: 3, etaMinutes: 8, freshnessTier: 'FRESH', currentLoad: 55 },
      CONFIG
    );
    expect(score).toBe(91);
    expect(breakdown).toEqual({ resource: 1, travel: 0.87, freshness: 1, load: 0.45 });
  });

  it('2 beds, 9 min, FRESH, 70% load → 73', () => {
    // 0.5·0.667 + 0.25·0.85 + 0.15 + 0.1·0.3 = 0.7258
    expect(
      computeScore({ matchingBedCount: 2, etaMinutes: 9, freshnessTier: 'FRESH', currentLoad: 70 }, CONFIG).score
    ).toBe(73);
  });

  it('stale data lowers the score', () => {
    const fresh = computeScore({ matchingBedCount: 3, etaMinutes: 8, freshnessTier: 'FRESH', currentLoad: 55 }, CONFIG);
    const stale = computeScore({ matchingBedCount: 3, etaMinutes: 8, freshnessTier: 'STALE', currentLoad: 55 }, CONFIG);
    expect(stale.score).toBe(79);
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it('resource saturates at 3 beds and travel never goes negative', () => {
    const { breakdown } = computeScore(
      { matchingBedCount: 10, etaMinutes: 90, freshnessTier: 'RECENT', currentLoad: 0 },
      CONFIG
    );
    expect(breakdown).toEqual({ resource: 1, travel: 0, freshness: 0.6, load: 1 });
  });
});

describe('computeConfidence', () => {
  it('maps freshness to a base level', () => {
    expect(computeConfidence({ freshnessTier: 'FRESH', matchingBedCount: 3, now: NOW }, CONFIG).level).toBe('HIGH');
    expect(computeConfidence({ freshnessTier: 'RECENT', matchingBedCount: 3, now: NOW }, CONFIG).level).toBe('MEDIUM');
    expect(computeConfidence({ freshnessTier: 'STALE', matchingBedCount: 3, now: NOW }, CONFIG).level).toBe('LOW');
  });

  it('downgrades for a single bed and a recent timeout, with reasons, floored at LOW', () => {
    const result = computeConfidence(
      { freshnessTier: 'FRESH', matchingBedCount: 1, lastTimeoutAt: secondsAgo(12 * 60), now: NOW },
      CONFIG
    );
    expect(result.level).toBe('LOW');
    expect(result.reasons).toEqual(['Only 1 matching bed', 'Missed a request 12 min ago']);

    const floored = computeConfidence({ freshnessTier: 'STALE', matchingBedCount: 1, now: NOW }, CONFIG);
    expect(floored.level).toBe('LOW');
  });

  it('ignores timeouts outside the window', () => {
    const result = computeConfidence(
      { freshnessTier: 'FRESH', matchingBedCount: 3, lastTimeoutAt: secondsAgo(31 * 60), now: NOW },
      CONFIG
    );
    expect(result.level).toBe('HIGH');
  });
});

describe('evaluateHospital (hard filters)', () => {
  const run = (h, beds, overrides = {}) =>
    evaluateHospital({
      hospital: h,
      beds,
      requirements: REQ,
      excluded: false,
      etaMinutes: 10,
      config: CONFIG,
      ...overrides,
    }).codes;

  it('passes a fully matching hospital', () => {
    expect(run(hospital('a'), [bed()])).toEqual([]);
  });

  it.each([
    ['HOSPITAL_INACTIVE', hospital('a', { status: 'INACTIVE' }), [bed()], {}],
    ['ALREADY_CONTACTED', hospital('a'), [bed()], { excluded: true }],
    ['NO_MATCHING_BED', hospital('a'), [bed({ status: 'OCCUPIED' }), bed({ type: 'GENERAL' })], {}],
    ['MISSING_EQUIPMENT', hospital('a'), [bed({ equipment: ['OXYGEN'] })], {}],
    ['MISSING_SPECIALTY', hospital('a', { specialties: ['TRAUMA'] }), [bed()], {}],
    ['CRITICAL_LOAD', hospital('a', { currentLoad: 95 }), [bed()], {}],
    ['OUT_OF_RANGE', hospital('a'), [bed()], { etaMinutes: 61 }],
  ])('%s', (code, h, beds, overrides) => {
    expect(run(h, beds, overrides)).toEqual([code]);
  });

  it('records every applicable reason', () => {
    const codes = run(hospital('a', { status: 'INACTIVE', specialties: [], currentLoad: 99 }), [], { excluded: true });
    expect(codes).toEqual([
      'HOSPITAL_INACTIVE',
      'ALREADY_CONTACTED',
      'NO_MATCHING_BED',
      'MISSING_SPECIALTY',
      'CRITICAL_LOAD',
    ]);
  });
});

describe('rankHospitals', () => {
  const input = (hospitals, beds, extra = {}) => ({
    hospitals,
    bedsByHospital: new Map(Object.entries(beds)),
    patientLocation: PATIENT,
    requirements: REQ,
    now: NOW,
    config: CONFIG,
    ...extra,
  });

  it('ranks a hand-calculated scenario in the expected order', () => {
    // All at the patient's location → ETA 1 min → travel = 0.9833
    const result = rankHospitals(
      input([hospital('h3', { currentLoad: 0 }), hospital('h2'), hospital('h1')], {
        h1: [bed(), bed(), bed()], // 0.5 + 0.2458 + 0.15 + 0.05 → 95
        h2: [
          bed({ updatedAt: secondsAgo(900) }),
          bed({ updatedAt: secondsAgo(900) }),
          bed({ updatedAt: secondsAgo(900) }),
        ], // stale → 83
        h3: [bed()], // 0.1667 + 0.2458 + 0.15 + 0.1 → 66
      })
    );
    expect(result.candidates.map((c) => [c.hospitalId, c.score, c.rank])).toEqual([
      ['h1', 95, 1],
      ['h2', 83, 2],
      ['h3', 66, 3],
    ]);
    expect(result.candidates[1]).toMatchObject({ freshness: 'STALE', confidence: 'LOW' });
    expect(result.candidates[2]).toMatchObject({ confidence: 'MEDIUM', confidenceReasons: ['Only 1 matching bed'] });
    expect(result.candidates[0].reasons).toEqual([
      'ICU available (3 beds)',
      'Ventilator available',
      'Cardiology department',
      '1-minute ETA (0 km)',
      'Availability updated 30 seconds ago',
      'Moderate hospital load (50%)',
    ]);
  });

  it('lists excluded hospitals with codes and messages', () => {
    const result = rankHospitals(
      input([hospital('ok'), hospital('noVent')], { ok: [bed()], noVent: [bed({ equipment: ['OXYGEN'] })] })
    );
    expect(result.candidates.map((c) => c.hospitalId)).toEqual(['ok']);
    expect(result.exclusions).toEqual([
      {
        hospitalId: 'noVent',
        hospitalName: 'Hospital noVent',
        coordinates: PATIENT,
        reasons: ['MISSING_EQUIPMENT'],
        messages: ['No available ICU bed with Ventilator'],
      },
    ]);
  });

  it('excludes already-contacted hospitals', () => {
    const result = rankHospitals(
      input([hospital('a'), hospital('b')], { a: [bed()], b: [bed()] }, { excludeHospitalIds: ['a'] })
    );
    expect(result.candidates.map((c) => c.hospitalId)).toEqual(['b']);
    expect(result.exclusions[0].reasons).toEqual(['ALREADY_CONTACTED']);
  });

  it('breaks ties by freshness age then hospital id', () => {
    const result = rankHospitals(
      input([hospital('b'), hospital('a'), hospital('c')], {
        a: [bed({ updatedAt: secondsAgo(50) })],
        b: [bed({ updatedAt: secondsAgo(50) })],
        c: [bed({ updatedAt: secondsAgo(10) })],
      })
    );
    expect(result.candidates.map((c) => c.hospitalId)).toEqual(['c', 'a', 'b']);
  });

  it('is deterministic: same input → same output', () => {
    const make = () =>
      input([hospital('x', { currentLoad: 30 }), hospital('y', { coordinates: { lat: 19.1, lng: 72.9 } })], {
        x: [bed(), bed({ updatedAt: secondsAgo(400) })],
        y: [bed(), bed(), bed(), bed()],
      });
    expect(rankHospitals(make())).toEqual(rankHospitals(make()));
  });

  it('compareCandidates orders by score, then ETA', () => {
    const a = { score: 80, etaMinutes: 10, freshnessAgeSeconds: 5, hospitalId: 'a' };
    const b = { score: 80, etaMinutes: 5, freshnessAgeSeconds: 50, hospitalId: 'b' };
    expect([a, b].sort(compareCandidates).map((c) => c.hospitalId)).toEqual(['b', 'a']);
  });
});
