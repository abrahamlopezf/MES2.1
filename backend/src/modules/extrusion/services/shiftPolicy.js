'use strict';

const SHIFT_CODES = Object.freeze(['TURNO_1', 'TURNO_2']);
const SHIFT_MAX_DURATION_MS = 12 * 60 * 60 * 1000;

const getMexicoCityDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const isOperatingDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  if (weekday >= 1 && weekday <= 4) return true;
  // Allow a same-day non-operating date only in local development so today's
  // workflow can be exercised without changing the production calendar.
  return process.env.NODE_ENV !== 'production' && value === getMexicoCityDate();
};

const nextOperatingDate = (value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  do { date.setUTCDate(date.getUTCDate() + 1); } while (date.getUTCDay() < 1 || date.getUTCDay() > 4);
  return date.toISOString().slice(0, 10);
};

const getShiftEntrySuggestion = ({ today, sessions = [] } = {}) => {
  const history = sessions
    .map((session) => ({
      date: String(session.shift_date || '').slice(0, 10),
      code: String(session.shift_code || '').trim().toUpperCase(),
    }))
    .filter((session) => /^\d{4}-\d{2}-\d{2}$/.test(session.date) && session.date <= today && SHIFT_CODES.includes(session.code))
    .sort((left, right) => right.date.localeCompare(left.date));

  if (!history.length) {
    return isOperatingDate(today)
      ? { shift_date: today, shift_code: 'TURNO_1', auto_start: true, reason: 'PRIMER_TURNO_DEL_DIA' }
      : { shift_date: nextOperatingDate(today), shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_NO_OPERATIVO' };
  }

  const latestDate = history[0].date;
  // A missed/unfinished shift from an earlier day is historical. It must not
  // block today's automatic Turno 1 or ask the next supervisor to open a stale
  // Turno 2 (for example, Nov 5 when today is Nov 11).
  if (latestDate < today) {
    return isOperatingDate(today)
      ? { shift_date: today, shift_code: 'TURNO_1', auto_start: true, reason: 'PRIMER_TURNO_DEL_DIA' }
      : { shift_date: nextOperatingDate(today), shift_code: 'TURNO_1', auto_start: false, reason: 'DIA_NO_OPERATIVO' };
  }

  const shiftsOnLatestDate = new Set(history.filter((session) => session.date === latestDate).map((session) => session.code));
  if (shiftsOnLatestDate.has('TURNO_1') && !shiftsOnLatestDate.has('TURNO_2')) {
    return { shift_date: latestDate, shift_code: 'TURNO_2', auto_start: false, reason: 'RELEVO_DEL_DIA' };
  }

  const nextDate = nextOperatingDate(latestDate);
  return {
    shift_date: nextDate,
    shift_code: 'TURNO_1',
    auto_start: nextDate === today && isOperatingDate(today),
    reason: nextDate === today ? 'PRIMER_TURNO_DEL_DIA' : 'DIA_COMPLETO',
  };
};

const getShiftHandoffSuggestion = ({ today, session } = {}) => {
  const shiftDate = String(session?.shift_date || '').slice(0, 10);
  const shiftCode = String(session?.shift_code || '').trim().toUpperCase();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate) || !SHIFT_CODES.includes(shiftCode)) return null;
  // A shift left open on an earlier operating day must still be explicitly
  // reconciled and handed off, but it must not force production to reopen a
  // missed historical slot (for example, yesterday's Turno 2).
  if (shiftDate < String(today || '')) {
    return getShiftEntrySuggestion({ today, sessions: [{ shift_date: shiftDate, shift_code: shiftCode }] });
  }
  if (shiftCode === 'TURNO_1') {
    return { shift_date: shiftDate, shift_code: 'TURNO_2', auto_start: false, reason: 'RELEVO_DEL_DIA' };
  }
  const nextDate = nextOperatingDate(shiftDate);
  return {
    shift_date: nextDate,
    shift_code: 'TURNO_1',
    auto_start: nextDate === today && isOperatingDate(today),
    reason: nextDate === today ? 'PRIMER_TURNO_DEL_DIA' : 'DIA_COMPLETO',
  };
};

const validateExtrusionShift = ({ shiftDate, shiftCode }) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(shiftDate || '')) || !SHIFT_CODES.includes(String(shiftCode || '').trim().toUpperCase())) {
    return 'Selecciona una fecha válida y Turno 1 o Turno 2.';
  }
  const date = new Date(`${shiftDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== shiftDate) return 'La fecha del turno no es válida.';
  if (!isOperatingDate(shiftDate)) return 'Extrusión opera de lunes a jueves; selecciona una fecha dentro de esos días.';
  return null;
};

const isExtrusionShiftExpired = (openedAt, now = new Date()) => {
  const opened = new Date(openedAt).getTime();
  return !Number.isFinite(opened) || now.getTime() - opened >= SHIFT_MAX_DURATION_MS;
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

module.exports = { SHIFT_CODES, SHIFT_MAX_DURATION_MS, validateExtrusionShift, isExtrusionShiftExpired, validateTransitionWeighings, filterQualifyingShiftQueues, getShiftQueueHandoffMode, isOperatingDate, nextOperatingDate, getShiftEntrySuggestion, getShiftHandoffSuggestion };
