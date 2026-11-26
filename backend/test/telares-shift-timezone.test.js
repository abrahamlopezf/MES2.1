'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getCdmxShift } = require('../src/utils/timezone');

const getAtCdmx = (date, hour, minute = 0) => {
  const utcHour = (hour + 6) % 24;
  const utcDate = new Date(`${date}T00:00:00.000Z`);
  if (hour >= 18) utcDate.setUTCDate(utcDate.getUTCDate() + 1);
  return new Date(`${utcDate.toISOString().slice(0, 10)}T${String(utcHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
};

test('Telares assigns shifts at 07:00, 15:00, and 23:00 CDMX', () => {
  const date = '2026-11-23';
  assert.equal(getCdmxShift(getAtCdmx(date, 6, 59)).shiftCode, 'TURNO_3');
  assert.equal(getCdmxShift(getAtCdmx(date, 7)).shiftCode, 'TURNO_1');
  assert.equal(getCdmxShift(getAtCdmx(date, 14, 59)).shiftCode, 'TURNO_1');
  assert.equal(getCdmxShift(getAtCdmx(date, 15)).shiftCode, 'TURNO_2');
  assert.equal(getCdmxShift(getAtCdmx(date, 22, 59)).shiftCode, 'TURNO_2');
  assert.equal(getCdmxShift(getAtCdmx(date, 23)).shiftCode, 'TURNO_3');
});

test('Telares attributes the overnight shift to the date it began', () => {
  const afterMidnight = getCdmxShift(getAtCdmx('2026-11-24', 2));
  assert.equal(afterMidnight.shiftCode, 'TURNO_3');
  assert.equal(afterMidnight.calendarDate, '2026-11-23');
});
