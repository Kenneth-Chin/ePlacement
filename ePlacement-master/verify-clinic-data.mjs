import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const dataCode = await fs.readFile(new URL('./clinic-data.js', import.meta.url), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(dataCode, context);

const data = context.window.GIRET_FACILITY_DATA;
const clinics = data.flatMap((entry) => entry.clinics);
const stateOrder = [
  'MELAKA', 'PERLIS', 'WP KUALA LUMPUR', 'PAHANG', 'SABAH',
  'NEGERI SEMBILAN', 'KELANTAN', 'TERENGGANU', 'SELANGOR',
  'PULAU PINANG', 'WP PUTRAJAYA', 'WP LABUAN', 'PERAK',
  'SARAWAK', 'JOHOR', 'KEDAH', 'ILK',
];
const demandMultipliers = {
  'WP KUALA LUMPUR': 2.3,
  'SELANGOR': 2,
  'WP PUTRAJAYA': 1.6,
  'PULAU PINANG': 1.4,
  'JOHOR': 1.3,
  'MELAKA': 1.15,
  'PERAK': 1.1,
};
assert.equal(data.length, 17, 'Expected 17 GIReT state/category groups.');
assert.equal(clinics.length, 793, 'Expected all 793 GIReT clinics.');
assert.equal(new Set(clinics.map((clinic) => clinic.code)).size, 793, 'Facility codes must be unique.');

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 0x100000000;
  };
}

function shuffle(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function availableFor(seed) {
  const random = createSeededRandom(seed);
  return [...data]
    .sort((a, b) => stateOrder.indexOf(a.state) - stateOrder.indexOf(b.state))
    .map((entry) => {
    const shuffledClinics = shuffle(entry.clinics, random);
    const rate = 0.15 + random() * 0.1;
    const count = Math.max(1, Math.min(entry.clinics.length, Math.round(entry.clinics.length * rate)));
    const clinics = shuffledClinics.slice(0, count).map((clinic) => {
      const willBeClaimed = random() <= 0.88;
      const demandMultiplier = demandMultipliers[entry.state] || 1;
      const claimAfterMs = willBeClaimed
        ? Math.round(2000 - Math.log(1 - random()) * (16000 / demandMultiplier))
        : null;
      return { ...clinic, competitorClaimAfterMs: claimAfterMs };
    });
    return { state: entry.state, total: entry.clinics.length, clinics };
  });
}

const firstRun = availableFor(12345);
const repeatedRun = availableFor(12345);
const secondRun = availableFor(54321);
assert.deepEqual(firstRun, repeatedRun, 'The same simulation seed must keep its availability and ordering.');
assert.notDeepEqual(firstRun, secondRun, 'New simulation seeds must change availability and ordering.');
assert.deepEqual(firstRun.map((state) => state.state), stateOrder, 'State display order must remain fixed.');
assert.deepEqual(secondRun.map((state) => state.state), stateOrder, 'State order must not change between simulations.');

for (const state of firstRun) {
  const lowerBound = Math.max(1, Math.round(state.total * 0.15));
  const upperBound = Math.max(1, Math.round(state.total * 0.25));
  assert.ok(state.clinics.length >= lowerBound && state.clinics.length <= upperBound,
    `${state.state} availability must remain around 20%.`);
}

const availableCount = firstRun.reduce((sum, state) => sum + state.clinics.length, 0);
const scheduledClaims = firstRun.flatMap((state) => state.clinics)
  .filter((clinic) => clinic.competitorClaimAfterMs !== null);
assert.ok(scheduledClaims.length > availableCount * 0.7, 'Most displayed clinics should receive competitor claim times.');
assert.equal(demandMultipliers['WP KUALA LUMPUR'], 2.3, 'Kuala Lumpur should have the strongest demand multiplier.');
assert.equal(demandMultipliers.SELANGOR, 2, 'Selangor should have the second strongest demand multiplier.');
console.log(`Verified 793 source clinics; seeded run exposes ${availableCount}, with ${scheduledClaims.length} competitor claims scheduled.`);
