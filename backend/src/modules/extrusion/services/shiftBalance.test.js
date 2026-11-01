const test = require('node:test');
const assert = require('node:assert/strict');
const { getExtrusionShiftWindow, getShiftDateForInstant, calculateShiftBalance, allocateVarianceByInput, addOperationalScrapInput, calculatePtiOutputEstimate, hasQualifyingShiftActivity } = require('./shiftBalance');

test('shift windows follow the plant schedule, including overnight third shift', () => {
  const first = getExtrusionShiftWindow('2026-10-30', 'TURNO_1');
  assert.equal(first.start.toISOString(), '2026-10-30T12:00:00.000Z');
  assert.equal(first.end.toISOString(), '2026-10-30T20:00:00.000Z');
  const third = getExtrusionShiftWindow('2026-10-30', 'TURNO_3');
  assert.equal(third.start.toISOString(), '2026-10-31T04:00:00.000Z');
  assert.equal(third.end.toISOString(), '2026-10-31T12:00:00.000Z');
});

test('overnight shift is attributed to the date it started before 06:00 CDMX', () => {
  assert.equal(getShiftDateForInstant(new Date('2026-10-31T08:00:00.000Z')), '2026-10-30');
  assert.equal(getShiftDateForInstant(new Date('2026-10-31T12:00:00.000Z')), '2026-10-31');
});

test('balance includes purge exactly once and reconciles scale variance', () => {
  const result = calculateShiftBalance({ goodOutputKg: 300, mixtureScrapKg: 50, purgeKg: 20, actualScrapKg: 73 });
  assert.equal(result.mixture_input_kg, 350);
  assert.equal(result.total_input_kg, 370);
  assert.equal(result.theoretical_scrap_kg, 70);
  assert.equal(result.variance_kg, 3);
});

test('variance allocation follows mixture input share and preserves rounding residual', () => {
  const result = allocateVarianceByInput([
    { mixture_qr: 'A', input_kg: 100 },
    { mixture_qr: 'B', input_kg: 200 },
  ], 3.001);
  assert.deepEqual(result.map((item) => item.variance_kg), [1, 2.001]);
});

test('inline PTI scrap is not counted twice, independent operational scrap is counted once', () => {
  const input = new Map([['MIX-A', 12.5]]);
  assert.equal(addOperationalScrapInput(input, { from_mixture_qr_id: 'MIX-A', source_production_entry_id: 71 }, 2), false);
  assert.equal(addOperationalScrapInput(input, { from_mixture_qr_id: 'MIX-A' }, 1.25), true);
  assert.equal(addOperationalScrapInput(input, { from_mixture_qr_id: 'MATERIAL_PURGA' }, 5), false);
  assert.equal(input.get('MIX-A'), 13.75);
});

test('PTI output uses frozen standard unit weights and estimates pieces from consumed kilograms', () => {
  const result = calculatePtiOutputEstimate([
    { pieces: 100, standard_unit_weight_kg: 0.5, net_weight_kg: 50.2 },
    { pieces: 20, standard_unit_weight_kg: 0.5, net_weight_kg: 10 },
  ], 70);
  assert.equal(result.useful_pti_kg, 60);
  assert.equal(result.observed_pieces, 120);
  assert.equal(result.average_standard_unit_weight_kg, 0.5);
  assert.equal(result.estimated_pieces_from_consumed_kg, 140);
});

test('legacy production without standard weights falls back to recorded net weight', () => {
  const result = calculatePtiOutputEstimate([
    { pieces: 10, standard_unit_weight_kg: null, net_weight_kg: 4.95 },
  ], 5);
  assert.equal(result.useful_pti_kg, 4.95);
  assert.equal(result.average_standard_unit_weight_kg, null);
  assert.equal(result.estimated_pieces_from_consumed_kg, null);
});

test('turn scrap is blocked unless preparation, production, or a transition occurred', () => {
  assert.equal(hasQualifyingShiftActivity(), false);
  assert.equal(hasQualifyingShiftActivity({ productionEntries: 1 }), true);
  assert.equal(hasQualifyingShiftActivity({ preparedMixes: 1 }), true);
  assert.equal(hasQualifyingShiftActivity({ transitions: 1 }), true);
});
