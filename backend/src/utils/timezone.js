/**
 * Utilidades Centralizadas de Zona Horaria para el Sistema Industrial
 * 
 * Parámetros Técnicos Oficiales:
 * - Identificador de Zona Horaria: America/Mexico_City
 * - Código Estándar: CST (Central Standard Time)
 * - Desfase UTC fijo: UTC-6 (-06:00 / 360 minutos)
 */

const TIMEZONE = 'America/Mexico_City';
const TIMEZONE_CODE = 'CST';
const UTC_OFFSET = '-06:00';
const UTC_OFFSET_HOURS = -6;
const UTC_OFFSET_MINUTES = 360;

/**
 * Obtiene la fecha actual garantizada en horario CDMX
 */
const nowCdmx = () => {
  return new Date();
};

/**
 * Retorna fecha formateada en formato ISO local YYYY-MM-DD en horario CDMX
 * Evita el clásico error de .toISOString() que añade 6 horas y rueda al día siguiente a partir de las 6:00 PM.
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} YYYY-MM-DD
 */
const getCdmxDateString = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Retorna hora formateada HH:mm:ss en horario CDMX (24 hrs)
 * @param {Date|string|number} [date=new Date()]
 * @returns {string} HH:mm:ss
 */
const getCdmxTimeString = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
};

/**
 * Retorna fecha y hora YYYY-MM-DD HH:mm:ss en horario CDMX
 * @param {Date|string|number} [date=new Date()]
 * @returns {string}
 */
const getCdmxDateTimeString = (date = new Date()) => {
  return `${getCdmxDateString(date)} ${getCdmxTimeString(date)}`;
};

/**
 * Retorna las partes desglosadas de la fecha en horario CDMX
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number }}
 */
const getCdmxDateParts = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      map[p.type] = parseInt(p.value, 10);
    }
  }

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour === 24 ? 0 : map.hour,
    minute: map.minute,
    second: map.second,
  };
};

/**
 * Determina el turno de producción industrial (8 horas) en base a la hora de CDMX:
 * - Turno 1 (Matutino): 06:00:00 a 13:59:59
 * - Turno 2 (Vespertino): 14:00:00 a 21:59:59
 * - Turno 3 (Nocturno): 22:00:00 a 05:59:59
 * 
 * @param {Date|string|number} [date=new Date()]
 * @returns {{ shiftNumber: number, shiftCode: string, shiftName: string, calendarDate: string }}
 */
const getCdmxShift = (date = new Date()) => {
  const parts = getCdmxDateParts(date);
  const hour = parts.hour;
  const calendarDate = getCdmxDateString(date);

  let shiftNumber = 1;
  let shiftCode = 'TURNO_1';
  let shiftName = '1° Turno (Matutino)';

  if (hour >= 6 && hour < 14) {
    shiftNumber = 1;
    shiftCode = 'TURNO_1';
    shiftName = '1° Turno (Matutino)';
  } else if (hour >= 14 && hour < 22) {
    shiftNumber = 2;
    shiftCode = 'TURNO_2';
    shiftName = '2° Turno (Vespertino)';
  } else {
    shiftNumber = 3;
    shiftCode = 'TURNO_3';
    shiftName = '3° Turno (Nocturno)';
  }

  return {
    shiftNumber,
    shiftCode,
    shiftName,
    calendarDate,
    hour,
  };
};

/**
 * Parsea una fecha YYYY-MM-DD y hora HH:mm:ss asociándola explícitamente al offset de CDMX (-06:00)
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} [timeStr='00:00:00'] HH:mm:ss
 * @returns {Date}
 */
const parseCdmxDate = (dateStr, timeStr = '00:00:00') => {
  return new Date(`${dateStr}T${timeStr}-06:00`);
};

/**
 * Formatea una fecha usando Intl con timeZone forzado a America/Mexico_City
 * @param {Date|string|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @param {string} [locale='es-MX']
 * @returns {string}
 */
const formatCdmx = (date, options = {}, locale = 'es-MX') => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat(locale, {
    timeZone: TIMEZONE,
    ...options,
  }).format(d);
};

module.exports = {
  TIMEZONE,
  TIMEZONE_CODE,
  UTC_OFFSET,
  UTC_OFFSET_HOURS,
  UTC_OFFSET_MINUTES,
  nowCdmx,
  getCdmxDateString,
  getCdmxTimeString,
  getCdmxDateTimeString,
  getCdmxDateParts,
  getCdmxShift,
  parseCdmxDate,
  formatCdmx,
};
