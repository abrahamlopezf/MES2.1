'use strict';

const SHIFT_CODES = Object.freeze(['TURNO_1', 'TURNO_2']); // códigos históricos que siguen siendo válidos
const SHIFT_MAX_DURATION_MS = 12 * 60 * 60 * 1000;
const DEFAULT_SHIFT_SCHEDULE = Object.freeze({ timezone: 'America/Mexico_City', operating_days: [1, 2, 3, 4], shifts: [
  { code: 'TURNO_1', label: 'Turno 1', start_time: '06:00', end_time: '18:00' },
  { code: 'TURNO_2', label: 'Turno 2', start_time: '18:00', end_time: '06:00' },
] });

const toMinutes = (time) => {
  const value = String(time || '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};
const toTime = (minutes) => `${String(Math.floor((minutes % 1440) / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const normalizeShiftSchedule = (value = {}) => {
  const rawOperatingDays = value.operating_days ?? DEFAULT_SHIFT_SCHEDULE.operating_days;
  if (!Array.isArray(rawOperatingDays)) return { error: 'Selecciona los días en que opera Extrusión.' };
  const operatingDays = [...new Set(rawOperatingDays.map(Number))].sort((left, right) => left - right);
  if (!operatingDays.length || operatingDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    return { error: 'Selecciona al menos un día válido de operación.' };
  }
  let shifts = Array.isArray(value.shifts) ? value.shifts : null;
  if (!shifts) {
    const start1 = String(value.TURNO_1 ?? value.turno_1_start ?? DEFAULT_SHIFT_SCHEDULE.shifts[0].start_time).trim();
    const start2 = String(value.TURNO_2 ?? value.turno_2_start ?? DEFAULT_SHIFT_SCHEDULE.shifts[1].start_time).trim();
    const firstMinutes = toMinutes(start1);
    const secondMinutes = toMinutes(start2);
    if (firstMinutes == null || secondMinutes == null) return { error: 'Captura horas válidas en formato de 24 horas (HH:MM).' };
    shifts = [
      { code: 'TURNO_1', label: 'Turno 1', start_time: start1, end_time: toTime(secondMinutes) },
      { code: 'TURNO_2', label: 'Turno 2', start_time: start2, end_time: toTime(firstMinutes) },
    ];
  }
  if (shifts.length < 1 || shifts.length > 24) return { error: 'La programación debe tener entre 1 y 24 turnos.' };
  const normalized = shifts.map((shift, index) => {
    const code = String(shift.code || '').trim().toUpperCase();
    const label = String(shift.label || `Turno ${index + 1}`).trim().slice(0, 30);
    const start = toMinutes(shift.start_time);
    const end = toMinutes(shift.end_time);
    return { code, label, start_time: String(shift.start_time || ''), end_time: String(shift.end_time || ''), start, end };
  });
  if (normalized.some((shift) => !/^TURNO_[1-9]\d*$/.test(shift.code) || !shift.label || shift.start == null || shift.end == null)) {
    return { error: 'Cada turno requiere un código, nombre y horas válidas en formato HH:MM.' };
  }
  if (new Set(normalized.map((shift) => shift.code)).size !== normalized.length) return { error: 'No puede haber códigos de turno duplicados.' };
  const ordered = [...normalized].sort((left, right) => left.start - right.start);
  if (ordered.length === 1 && ordered[0].start === ordered[0].end) {
    return { schedule: { timezone: 'America/Mexico_City', operating_days: operatingDays, shifts: [{ ...ordered[0], duration_hours: 24 }].map(({ start, end, ...shift }) => shift) } };
  }
  let totalDuration = 0;
  const calculated = ordered.map((shift, index) => {
    const next = ordered[(index + 1) % ordered.length];
    const durationMinutes = (shift.end - shift.start + 1440) % 1440 || 1440;
    if (durationMinutes < 60) return null;
    if (shift.end !== next.start) return null;
    totalDuration += durationMinutes;
    return { ...shift, duration_hours: Number((durationMinutes / 60).toFixed(2)) };
  });
  if (calculated.some((shift) => !shift) || totalDuration !== 1440) {
    return { error: 'Los turnos deben cubrir las 24 horas en secuencia, sin huecos, traslapes ni duraciones menores a 1 hora.' };
  }
  return {
    schedule: {
      timezone: 'America/Mexico_City',
      operating_days: operatingDays,
      shifts: calculated.map(({ start, end, ...shift }) => shift),
    },
  };
};

const getScheduleShifts = (schedule) => normalizeShiftSchedule(schedule || {}).schedule?.shifts || DEFAULT_SHIFT_SCHEDULE.shifts;
const getShiftDurationMs = (schedule, shiftCode) => {
  const shift = getScheduleShifts(schedule).find((item) => item.code === String(shiftCode || '').toUpperCase());
  return shift ? Number(shift.duration_hours) * 60 * 60 * 1000 : SHIFT_MAX_DURATION_MS;
};

const getMexicoCityDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getMexicoCityDateTime = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
};

const getShiftForInstant = ({ now, schedule = DEFAULT_SHIFT_SCHEDULE } = {}) => {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return null;
  const shifts = getScheduleShifts(schedule);
  const local = getMexicoCityDateTime(now);
  const ordered = [...shifts].sort((left, right) => toMinutes(left.start_time) - toMinutes(right.start_time));
  const currentIndex = ordered.reduce((index, shift, candidateIndex) => (
    toMinutes(shift.start_time) <= local.minutes ? candidateIndex : index
  ), -1);

  if (currentIndex >= 0) {
    return { shift_date: local.date, shift_code: ordered[currentIndex].code, shift: ordered[currentIndex], minutes: local.minutes };
  }

  const previousDate = new Date(`${local.date}T00:00:00.000Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const shiftDate = previousDate.toISOString().slice(0, 10);
  return { shift_date: shiftDate, shift_code: ordered.at(-1).code, shift: ordered.at(-1), minutes: local.minutes };
};

const getOperatingDays = (schedule) => {
  const days = schedule?.operating_days;
  return Array.isArray(days) && days.length ? [...new Set(days.map(Number))] : DEFAULT_SHIFT_SCHEDULE.operating_days;
};

const isOperatingDate = (value, schedule = DEFAULT_SHIFT_SCHEDULE) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  if (getOperatingDays(schedule).includes(weekday)) return true;
  // Allow a same-day non-operating date only in local development so today's
  // workflow can be exercised without changing the production calendar.
  return process.env.NODE_ENV !== 'production' && value === getMexicoCityDate();
};

const nextOperatingDate = (value, schedule = DEFAULT_SHIFT_SCHEDULE) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  do { date.setUTCDate(date.getUTCDate() + 1); } while (!getOperatingDays(schedule).includes(date.getUTCDay()));
  return date.toISOString().slice(0, 10);
};

const getShiftEntrySuggestion = ({ today, sessions = [], schedule = DEFAULT_SHIFT_SCHEDULE, now } = {}) => {
  const shifts = getScheduleShifts(schedule);
  const firstShiftCode = shifts[0].code;
  const history = sessions
    .map((session) => ({
      date: String(session.shift_date || '').slice(0, 10),
      code: String(session.shift_code || '').trim().toUpperCase(),
    }))
    .filter((session) => /^\d{4}-\d{2}-\d{2}$/.test(session.date) && session.date <= today)
    .sort((left, right) => right.date.localeCompare(left.date));

  if (!history.length) {
    const scheduled = getShiftForInstant({ now, schedule });
    if (scheduled && isOperatingDate(scheduled.shift_date, schedule)) {
      return { shift_date: scheduled.shift_date, shift_code: scheduled.shift_code, auto_start: true, reason: 'TURNO_ACTUAL_POR_HORARIO' };
    }
    return isOperatingDate(today, schedule)
      ? { shift_date: today, shift_code: firstShiftCode, auto_start: true, reason: 'PRIMER_TURNO_DEL_DIA' }
      : { shift_date: nextOperatingDate(today, schedule), shift_code: firstShiftCode, auto_start: false, reason: 'DIA_NO_OPERATIVO' };
  }

  const latestDate = history[0].date;
  // A missed/unfinished shift from an earlier day is historical. It must not
  // block today's automatic Turno 1 or ask the next supervisor to open a stale
  // Turno 2 (for example, Nov 5 when today is Nov 11).
  if (latestDate < today) {
    const scheduled = getShiftForInstant({ now, schedule });
    if (scheduled && isOperatingDate(scheduled.shift_date, schedule)) {
      return { shift_date: scheduled.shift_date, shift_code: scheduled.shift_code, auto_start: true, reason: 'TURNO_ACTUAL_POR_HORARIO' };
    }
    return isOperatingDate(today, schedule)
      ? { shift_date: today, shift_code: firstShiftCode, auto_start: true, reason: 'PRIMER_TURNO_DEL_DIA' }
      : { shift_date: nextOperatingDate(today, schedule), shift_code: firstShiftCode, auto_start: false, reason: 'DIA_NO_OPERATIVO' };
  }

  const shiftsOnLatestDate = new Set(history.filter((session) => session.date === latestDate).map((session) => session.code));
  const nextSameDayShift = shifts.find((shift) => !shiftsOnLatestDate.has(shift.code));
  if (latestDate === today && nextSameDayShift) {
    return { shift_date: latestDate, shift_code: nextSameDayShift.code, auto_start: false, reason: 'RELEVO_DEL_DIA' };
  }

  const nextDate = nextOperatingDate(latestDate, schedule);
  return {
    shift_date: nextDate,
    shift_code: firstShiftCode,
    auto_start: nextDate === today && isOperatingDate(today, schedule),
    reason: nextDate === today ? 'PRIMER_TURNO_DEL_DIA' : 'DIA_COMPLETO',
  };
};

const getShiftHandoffSuggestion = ({ today, session, schedule = DEFAULT_SHIFT_SCHEDULE, now } = {}) => {
  const shifts = getScheduleShifts(schedule);
  const firstShiftCode = shifts[0].code;
  const shiftDate = String(session?.shift_date || '').slice(0, 10);
  const shiftCode = String(session?.shift_code || '').trim().toUpperCase();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate) || !shifts.some((shift) => shift.code === shiftCode)) return null;
  const includeAvailability = (suggestion) => {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime()) || !suggestion) return suggestion;
    const targetShift = shifts.find((shift) => shift.code === suggestion.shift_code);
    const local = getMexicoCityDateTime(now);
    const targetDate = String(suggestion.shift_date || '');
    const availableAt = targetShift ? `${targetDate} ${targetShift.start_time} CDMX` : null;
    const canStart = Boolean(targetShift) && (targetDate < local.date
      || (targetDate === local.date && local.minutes >= toMinutes(targetShift.start_time)));
    return { ...suggestion, can_start: canStart, available_at: availableAt };
  };
  // A shift left open on an earlier operating day must still be explicitly
  // reconciled and handed off, but it must not force production to reopen a
  // missed historical slot (for example, yesterday's Turno 2).
  if (shiftDate < String(today || '')) {
    return includeAvailability(getShiftEntrySuggestion({ today, sessions: [{ shift_date: shiftDate, shift_code: shiftCode }], schedule, now }));
  }
  const currentIndex = shifts.findIndex((shift) => shift.code === shiftCode);
  if (currentIndex >= 0 && currentIndex < shifts.length - 1) {
    return includeAvailability({ shift_date: shiftDate, shift_code: shifts[currentIndex + 1].code, auto_start: false, reason: 'RELEVO_DEL_DIA' });
  }
  const nextDate = nextOperatingDate(shiftDate, schedule);
  return includeAvailability({
    shift_date: nextDate,
    shift_code: firstShiftCode,
    auto_start: nextDate === today && isOperatingDate(today, schedule),
    reason: nextDate === today ? 'PRIMER_TURNO_DEL_DIA' : 'DIA_COMPLETO',
  });
};

const isShiftStartReached = ({ shiftDate, shiftCode, schedule = DEFAULT_SHIFT_SCHEDULE, now = new Date() } = {}) => {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return false;
  const shift = getScheduleShifts(schedule).find((item) => item.code === String(shiftCode || '').trim().toUpperCase());
  if (!shift || !/^\d{4}-\d{2}-\d{2}$/.test(String(shiftDate || ''))) return false;
  const local = getMexicoCityDateTime(now);
  const targetDate = String(shiftDate).slice(0, 10);
  return targetDate < local.date || (targetDate === local.date && local.minutes >= toMinutes(shift.start_time));
};

const validateExtrusionShift = ({ shiftDate, shiftCode, schedule = DEFAULT_SHIFT_SCHEDULE }) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(shiftDate || '')) || !getScheduleShifts(schedule).some((shift) => shift.code === String(shiftCode || '').trim().toUpperCase())) {
    return 'Selecciona una fecha válida y un turno vigente en la programación.';
  }
  const date = new Date(`${shiftDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== shiftDate) return 'La fecha del turno no es válida.';
  if (!isOperatingDate(shiftDate, schedule)) {
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const operatingDays = getOperatingDays(schedule).map((day) => dayNames[day]);
    return `Extrusión opera ${operatingDays.length === 1 ? 'el día' : 'los días'} ${operatingDays.join(', ')}; selecciona una fecha dentro de esos días.`;
  }
  return null;
};

const isExtrusionShiftExpired = (openedAt, now = new Date(), maxDurationMs = SHIFT_MAX_DURATION_MS) => {
  const opened = new Date(openedAt).getTime();
  return !Number.isFinite(opened) || now.getTime() - opened >= maxDurationMs;
};

const validateTransitionWeighings = ({ purgeWeightKg, expectedRemnantKg = 0, remnantWeightKg }) => {
  const purge = purgeWeightKg == null ? NaN : Number(purgeWeightKg);
  if (!Number.isFinite(purge) || purge <= 0) return { error: 'Pesa el purgante colocado en el husillo e ingresa un peso mayor a 0 kg.' };
  const expected = Math.max(0, Number(expectedRemnantKg) || 0);
  if (expected <= 0.001) return { purgeWeightKg: purge, remnantWeightKg: null };
  const remnant = remnantWeightKg == null || remnantWeightKg === '' ? NaN : Number(remnantWeightKg);
  if (!Number.isFinite(remnant) || remnant < 0 || remnant > expected + 0.001) {
    return { error: `Pesa el remanente y captura un valor entre 0 y ${expected.toFixed(3)} kg.` };
  }
  return { purgeWeightKg: purge, remnantWeightKg: Number(remnant.toFixed(3)) };
};

const filterQualifyingShiftQueues = ({ queues = [], shiftSessionId, start, end, preparedIds = [], incomingQueueIds = [] } = {}) => {
  const preparations = new Set(preparedIds.map(Number));
  const incoming = new Set(incomingQueueIds.map(Number));
  return queues.filter((queue) => {
    const queueId = Number(queue.id);
    if (incoming.has(queueId)) return false;
    if (preparations.has(Number(queue.process_preparation_id))) return true;
    const assignedToShift = shiftSessionId != null && Number(queue.shift_session_id) === Number(shiftSessionId);
    const createdAt = new Date(queue.created_at);
    const createdDuringShift = start && end && createdAt >= new Date(start) && createdAt < new Date(end);
    return assignedToShift || createdDuringShift;
  });
};

const getShiftQueueHandoffMode = (status) => {
  const queueStatus = String(status || '').trim().toUpperCase();
  if (queueStatus === 'ACTIVA') return 'CONTINUIDAD_ACTIVA';
  if (queueStatus === 'EN_ESPERA') return 'CONTENEDOR_EN_ESPERA';
  if (queueStatus === 'PAUSADA') return 'PESAR_Y_CLASIFICAR';
  return 'NO_TRANSFERIR';
};

module.exports = { SHIFT_CODES, SHIFT_MAX_DURATION_MS, DEFAULT_SHIFT_SCHEDULE, normalizeShiftSchedule, getScheduleShifts, getOperatingDays, getShiftDurationMs, validateExtrusionShift, isExtrusionShiftExpired, validateTransitionWeighings, filterQualifyingShiftQueues, getShiftQueueHandoffMode, isOperatingDate, nextOperatingDate, getShiftForInstant, getShiftEntrySuggestion, getShiftHandoffSuggestion, isShiftStartReached };
