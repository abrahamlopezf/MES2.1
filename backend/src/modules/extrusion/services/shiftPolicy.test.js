'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SHIFT_CODES, SHIFT_MAX_DURATION_MS, normalizeShiftSchedule, getShiftDurationMs, validateExtrusionShift, isExtrusionShiftExpired, validateTransitionWeighings, filterQualifyingShiftQueues, getShiftQueueHandoffMode, getShiftHandoffSuggestion, isShiftStartReached } = require('./shiftPolicy');

test('the default schedule retains two historical shifts and Monday through Thursday', () => {
  assert.deepEqual(SHIFT_CODES, ['TURNO_1', 'TURNO_2']);
  assert.equal(validateExtrusionShift({ shiftDate: '2026-11-02', shiftCode: 'TURNO_1' }), null); // Monday
  assert.equal(validateExtrusionShift({ shiftDate: '2026-11-05', shiftCode: 'TURNO_2' }), null); // Thursday
});

test('extrusion validates shift date and code against the default operating days', () => {
  assert.match(validateExtrusionShift({ shiftDate: '2026-11-06', shiftCode: 'TURNO_1' }), /opera los días lunes, martes, miércoles, jueves/);
  assert.match(validateExtrusionShift({ shiftDate: '2026-11-02', shiftCode: 'TURNO_3' }), /turno vigente en la programación/);
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
    today: '2026-11-20',
    session: { shift_date: '2026-11-12', shift_code: 'TURNO_2' },
  }), {
    shift_date: '2026-11-23', shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_NO_OPERATIVO',
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

test('a same-day handoff cannot be received before its scheduled start in Mexico City time', () => {
  const schedule = normalizeShiftSchedule({
    operating_days: [1, 2, 3, 4, 5],
    shifts: [
      { code: 'TURNO_1', label: 'Turno 1', start_time: '06:00', end_time: '14:00' },
      { code: 'TURNO_2', label: 'Turno 2', start_time: '14:00', end_time: '22:00' },
      { code: 'TURNO_3', label: 'Turno 3', start_time: '22:00', end_time: '06:00' },
    ],
  }).schedule;
  const outgoing = { shift_date: '2026-11-25', shift_code: 'TURNO_2' };
  const beforeStart = new Date('2026-11-26T03:59:00.000Z'); // Nov 25, 21:59 CDMX
  const atStart = new Date('2026-11-26T04:00:00.000Z'); // Nov 25, 22:00 CDMX

  assert.equal(isShiftStartReached({ shiftDate: '2026-11-25', shiftCode: 'TURNO_3', schedule, now: beforeStart }), false);
  assert.equal(isShiftStartReached({ shiftDate: '2026-11-25', shiftCode: 'TURNO_3', schedule, now: atStart }), true);
  assert.deepEqual(getShiftHandoffSuggestion({ today: '2026-11-25', session: outgoing, schedule, now: beforeStart }), {
    shift_date: '2026-11-25', shift_code: 'TURNO_3', auto_start: false, reason: 'RELEVO_DEL_DIA', can_start: false, available_at: '2026-11-25 22:00 CDMX',
  });
  assert.equal(getShiftHandoffSuggestion({ today: '2026-11-25', session: outgoing, schedule, now: atStart }).can_start, true);
  // Turno 3 keeps the date on which it started, even after midnight.
  assert.equal(isShiftStartReached({ shiftDate: '2026-11-25', shiftCode: 'TURNO_3', schedule, now: new Date('2026-11-26T07:00:00.000Z') }), true);
});

test('custom three-shift schedule validates, expires, and advances handoff dynamically', () => {
  const schedule = normalizeShiftSchedule({ shifts: [
    { code: 'TURNO_1', label: 'Mañana', start_time: '00:00', end_time: '08:00' },
    { code: 'TURNO_2', label: 'Tarde', start_time: '08:00', end_time: '16:00' },
    { code: 'TURNO_3', label: 'Noche', start_time: '16:00', end_time: '00:00' },
  ] }).schedule;
  assert.ok(schedule);
  assert.equal(validateExtrusionShift({ shiftDate: '2026-11-02', shiftCode: 'TURNO_3', schedule }), null);
  assert.equal(getShiftDurationMs(schedule, 'TURNO_2'), 8 * 60 * 60 * 1000);
  const openedAt = new Date('2026-11-02T14:00:00.000Z');
  assert.equal(isExtrusionShiftExpired(openedAt, new Date(openedAt.getTime() + 8 * 60 * 60 * 1000 - 1), getShiftDurationMs(schedule, 'TURNO_2')), false);
  assert.equal(isExtrusionShiftExpired(openedAt, new Date(openedAt.getTime() + 8 * 60 * 60 * 1000), getShiftDurationMs(schedule, 'TURNO_2')), true);
  assert.deepEqual(getShiftHandoffSuggestion({ today: '2026-11-02', session: { shift_date: '2026-11-02', shift_code: 'TURNO_2' }, schedule }), {
    shift_date: '2026-11-02', shift_code: 'TURNO_3', auto_start: false, reason: 'RELEVO_DEL_DIA',
  });
  assert.deepEqual(getShiftHandoffSuggestion({ today: '2026-11-02', session: { shift_date: '2026-11-02', shift_code: 'TURNO_3' }, schedule }), {
    shift_date: '2026-11-03', shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_COMPLETO',
  });
});

test('a custom schedule rejects gaps, overlaps, and shifts shorter than one hour', () => {
  assert.match(normalizeShiftSchedule({ shifts: [
    { code: 'TURNO_1', label: 'A', start_time: '00:00', end_time: '11:00' },
    { code: 'TURNO_2', label: 'B', start_time: '12:00', end_time: '00:00' },
  ] }).error, /sin huecos, traslapes/);
  assert.match(normalizeShiftSchedule({ shifts: [
    { code: 'TURNO_1', label: 'A', start_time: '00:00', end_time: '00:30' },
    { code: 'TURNO_2', label: 'B', start_time: '00:30', end_time: '00:00' },
  ] }).error, /sin huecos, traslapes/);
});

test('custom operating days control valid dates, automatic starts, and next-day handoffs', () => {
  const schedule = normalizeShiftSchedule({
    operating_days: [5, 6],
    shifts: [
      { code: 'TURNO_1', label: 'Día', start_time: '06:00', end_time: '18:00' },
      { code: 'TURNO_2', label: 'Noche', start_time: '18:00', end_time: '06:00' },
    ],
  }).schedule;
  assert.deepEqual(schedule.operating_days, [5, 6]);
  assert.equal(validateExtrusionShift({ shiftDate: '2026-11-06', shiftCode: 'TURNO_1', schedule }), null); // Friday
  assert.match(validateExtrusionShift({ shiftDate: '2026-11-05', shiftCode: 'TURNO_1', schedule }), /opera los días viernes, sábado/); // Thursday
  assert.deepEqual(require('./shiftPolicy').getShiftEntrySuggestion({ today: '2026-11-05', schedule }), {
    shift_date: '2026-11-06', shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_NO_OPERATIVO',
  });
  assert.deepEqual(require('./shiftPolicy').getShiftEntrySuggestion({ today: '2026-11-06', schedule }), {
    shift_date: '2026-11-06', shift_code: 'TURNO_1', auto_start: true, reason: 'PRIMER_TURNO_DEL_DIA',
  });
  assert.deepEqual(require('./shiftPolicy').getShiftHandoffSuggestion({
    today: '2026-11-06',
    session: { shift_date: '2026-11-06', shift_code: 'TURNO_2' },
    schedule,
  }), {
    shift_date: '2026-11-07', shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_COMPLETO',
  });
});

test('temporary Monday-Friday three-shift schedule handles Friday, Saturday, and a three-stage handoff', () => {
  const schedule = normalizeShiftSchedule({
    operating_days: [1, 2, 3, 4, 5],
    shifts: [
      { code: 'TURNO_1', label: 'Turno 1', start_time: '06:00', end_time: '14:00' },
      { code: 'TURNO_2', label: 'Turno 2', start_time: '14:00', end_time: '22:00' },
      { code: 'TURNO_3', label: 'Turno 3', start_time: '22:00', end_time: '06:00' },
    ],
  }).schedule;

  assert.deepEqual(schedule.operating_days, [1, 2, 3, 4, 5]);
  assert.deepEqual(schedule.shifts.map((shift) => shift.duration_hours), [8, 8, 8]);
  assert.equal(validateExtrusionShift({ shiftDate: '2026-11-20', shiftCode: 'TURNO_3', schedule }), null); // Friday
  assert.match(validateExtrusionShift({ shiftDate: '2026-11-28', shiftCode: 'TURNO_1', schedule }), /lunes, martes, miércoles, jueves, viernes/); // Saturday
  assert.deepEqual(require('./shiftPolicy').getShiftEntrySuggestion({ today: '2026-11-20', schedule }), {
    shift_date: '2026-11-20', shift_code: 'TURNO_1', auto_start: true, reason: 'PRIMER_TURNO_DEL_DIA',
  });
  assert.deepEqual(getShiftHandoffSuggestion({
    today: '2026-11-19',
    session: { shift_date: '2026-11-19', shift_code: 'TURNO_2' },
    schedule,
  }), {
    shift_date: '2026-11-19', shift_code: 'TURNO_3', auto_start: false, reason: 'RELEVO_DEL_DIA',
  });
  assert.deepEqual(getShiftHandoffSuggestion({
    today: '2026-11-20',
    session: { shift_date: '2026-11-20', shift_code: 'TURNO_3' },
    schedule,
  }), {
    shift_date: '2026-11-23', shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_COMPLETO',
  });
  assert.deepEqual(require('./shiftPolicy').getShiftEntrySuggestion({ today: '2026-11-28', schedule }), {
    shift_date: '2026-11-30', shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_NO_OPERATIVO',
  });
});

test('a stale handoff selects the shift currently running in Mexico City time, not Turno 1 by default', () => {
  const schedule = normalizeShiftSchedule({
    operating_days: [1, 2, 3, 4, 5],
    shifts: [
      { code: 'TURNO_1', label: 'Turno 1', start_time: '06:00', end_time: '14:00' },
      { code: 'TURNO_2', label: 'Turno 2', start_time: '14:00', end_time: '22:00' },
      // TURNO_3 was used historically, so the newly-added shift keeps its non-reused code.
      { code: 'TURNO_4', label: 'Turno 3', start_time: '22:00', end_time: '06:00' },
    ],
  }).schedule;
  const now = new Date('2026-11-19T04:33:00.000Z'); // Wednesday 22:33 in Mexico City

  assert.deepEqual(getShiftHandoffSuggestion({
    today: '2026-11-18',
    session: { shift_date: '2026-11-12', shift_code: 'TURNO_2' },
    schedule,
    now,
  }), {
    shift_date: '2026-11-18', shift_code: 'TURNO_4', auto_start: true, reason: 'TURNO_ACTUAL_POR_HORARIO', can_start: true, available_at: '2026-11-18 22:00 CDMX',
  });
  assert.deepEqual(require('./shiftPolicy').getShiftEntrySuggestion({ today: '2026-11-18', schedule, now }), {
    shift_date: '2026-11-18', shift_code: 'TURNO_4', auto_start: true, reason: 'TURNO_ACTUAL_POR_HORARIO',
  });
});

test('the overnight shift keeps the operational date on which it started', () => {
  const schedule = normalizeShiftSchedule({
    operating_days: [1, 2, 3, 4, 5],
    shifts: [
      { code: 'TURNO_1', label: 'Turno 1', start_time: '06:00', end_time: '14:00' },
      { code: 'TURNO_2', label: 'Turno 2', start_time: '14:00', end_time: '22:00' },
      { code: 'TURNO_4', label: 'Turno 3', start_time: '22:00', end_time: '06:00' },
    ],
  }).schedule;
  const now = new Date('2026-11-21T08:30:00.000Z'); // Saturday 02:30 in Mexico City; Friday Turno 3

  assert.deepEqual(require('./shiftPolicy').getShiftEntrySuggestion({ today: '2026-11-21', schedule, now }), {
    shift_date: '2026-11-20', shift_code: 'TURNO_4', auto_start: true, reason: 'TURNO_ACTUAL_POR_HORARIO',
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
