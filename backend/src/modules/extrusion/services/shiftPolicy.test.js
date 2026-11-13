'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SHIFT_CODES, SHIFT_MAX_DURATION_MS, validateExtrusionShift, isExtrusionShiftExpired, validateTransitionWeighings, filterQualifyingShiftQueues, getShiftQueueHandoffMode, getShiftHandoffSuggestion } = require('./shiftPolicy');

test('extrusion allows only two shifts and Monday through Thursday', () => {
  assert.deepEqual(SHIFT_CODES, ['TURNO_1', 'TURNO_2']);
  assert.equal(validateExtrusionShift({ shiftDate: '2026-11-02', shiftCode: 'TURNO_1' }), null); // Monday
  assert.equal(validateExtrusionShift({ shiftDate: '2026-11-05', shiftCode: 'TURNO_2' }), null); // Thursday
});

test('extrusion validates shift date and code', () => {
  assert.equal(validateExtrusionShift({ shiftDate: '2026-11-06', shiftCode: 'TURNO_1' }), 'Extrusión opera de lunes a jueves; selecciona una fecha dentro de esos días.');
  assert.match(validateExtrusionShift({ shiftDate: '2026-11-02', shiftCode: 'TURNO_3' }), /Turno 1 o Turno 2/);
  assert.match(validateExtrusionShift({ shiftDate: 'not-a-date', shiftCode: 'TURNO_1' }), /fecha válida/);
});

test('an unfinished historical shift does not create a stale second-shift prompt', () => {
  const suggestion = require('./shiftPolicy').getShiftEntrySuggestion({
    today: '2026-11-06', // Friday after a Thursday Turno 1
    sessions: [{ shift_date: '2026-11-05', shift_code: 'TURNO_1' }],
  });
  assert.deepEqual(suggestion, {
    shift_date: '2026-11-09', shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_NO_OPERATIVO',
  });
});

test('shift suggestion advances to the next operating day after both shifts close', () => {
  const suggestion = require('./shiftPolicy').getShiftEntrySuggestion({
    today: '2026-11-09',
    sessions: [
      { shift_date: '2026-11-05', shift_code: 'TURNO_1' },
      { shift_date: '2026-11-05', shift_code: 'TURNO_2' },
    ],
  });
  assert.deepEqual(suggestion, {
    shift_date: '2026-11-09', shift_code: 'TURNO_1', auto_start: true, reason: 'PRIMER_TURNO_DEL_DIA',
  });
});

test('a stale open shift is reconciled, then hands off to the current operating day Turno 1', () => {
  assert.deepEqual(getShiftHandoffSuggestion({
    today: '2026-11-12',
    session: { shift_date: '2026-11-11', shift_code: 'TURNO_1' },
  }), {
    shift_date: '2026-11-12', shift_code: 'TURNO_1', auto_start: true, reason: 'PRIMER_TURNO_DEL_DIA',
  });
});

test('a stale open shift on Thursday hands off to the next operating day without reopening a stale slot', () => {
  assert.deepEqual(getShiftHandoffSuggestion({
    today: '2026-11-13',
    session: { shift_date: '2026-11-12', shift_code: 'TURNO_2' },
  }), {
    shift_date: '2026-11-16', shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_NO_OPERATIVO',
  });
});

test('a same-day Turno 1 still hands off to Turno 2', () => {
  assert.deepEqual(getShiftHandoffSuggestion({
    today: '2026-11-12',
    session: { shift_date: '2026-11-12', shift_code: 'TURNO_1' },
  }), {
    shift_date: '2026-11-12', shift_code: 'TURNO_2', auto_start: false, reason: 'RELEVO_DEL_DIA',
  });
});

test('shift expires after twelve hours; custody remains until explicit close', () => {
  const openedAt = new Date('2026-11-02T06:00:00.000Z');
  assert.equal(isExtrusionShiftExpired(openedAt, new Date(openedAt.getTime() + SHIFT_MAX_DURATION_MS - 1)), false);
  assert.equal(isExtrusionShiftExpired(openedAt, new Date(openedAt.getTime() + SHIFT_MAX_DURATION_MS)), true);
});

test('a mixture transition requires measured purge and captures measured remnant within its digital balance', () => {
  assert.match(validateTransitionWeighings({ purgeWeightKg: 0, expectedRemnantKg: 4 }).error, /purgante/);
  assert.match(validateTransitionWeighings({ purgeWeightKg: 0.25, expectedRemnantKg: 4 }).error, /remanente/);
  assert.match(validateTransitionWeighings({ purgeWeightKg: 0.25, expectedRemnantKg: 4, remnantWeightKg: 4.2 }).error, /entre 0 y 4.000 kg/);
  assert.deepEqual(validateTransitionWeighings({ purgeWeightKg: 0.25, expectedRemnantKg: 4, remnantWeightKg: 3.125 }), { purgeWeightKg: 0.25, remnantWeightKg: 3.125 });
  assert.deepEqual(validateTransitionWeighings({ purgeWeightKg: 0.25, expectedRemnantKg: 0 }), { purgeWeightKg: 0.25, remnantWeightKg: null });
});

test('receiving a carried mix alone does not count as production activity in the new shift', () => {
  const start = new Date('2026-11-03T06:00:00-06:00');
  const end = new Date('2026-11-03T18:00:00-06:00');
  const queues = [
    { id: 10, shift_session_id: 2, process_preparation_id: 4, created_at: '2026-11-02T12:00:00Z' },
    { id: 11, shift_session_id: 2, process_preparation_id: 5, created_at: '2026-11-03T14:00:00Z' },
  ];
  const result = filterQualifyingShiftQueues({ queues, shiftSessionId: 2, start, end, preparedIds: [5], incomingQueueIds: [10] });
  assert.deepEqual(result.map((queue) => queue.id), [11]);
});

test('shift transfer distinguishes an active mix, an unopened queued container, and a paused remnant', () => {
  assert.equal(getShiftQueueHandoffMode('ACTIVA'), 'CONTINUIDAD_ACTIVA');
  assert.equal(getShiftQueueHandoffMode('EN_ESPERA'), 'CONTENEDOR_EN_ESPERA');
  assert.equal(getShiftQueueHandoffMode('PAUSADA'), 'PESAR_Y_CLASIFICAR');
  assert.equal(getShiftQueueHandoffMode('COMPLETADA'), 'NO_TRANSFERIR');
});
