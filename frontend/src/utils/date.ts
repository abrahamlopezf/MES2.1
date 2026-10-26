/**
 * Utilidades Centralizadas de Fecha y Hora - Horario Oficial CDMX (CST / UTC-6)
 * 
 * Parámetros Técnicos Oficiales:
 * - Identificador de Zona Horaria: America/Mexico_City
 * - Código Estándar: CST (Central Standard Time)
 * - Desfase UTC fijo: UTC-6 (-06:00 / 360 minutos)
 */

export const TIMEZONE_CDMX = 'America/Mexico_City';
export const TIMEZONE_CST = 'CST';
export const UTC_OFFSET_CDMX = '-06:00';
export const UTC_OFFSET_MINUTES = 360;

/**
 * Retorna fecha formateada en formato local YYYY-MM-DD según el calendario oficial de CDMX
 * @param date Fecha a formatear (Date, ISO string o timestamp)
 * @returns {string} YYYY-MM-DD
 */
export const getCdmxDateString = (date: Date | string | number = new Date()): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE_CDMX,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Retorna hora formateada HH:mm:ss o HH:mm en horario CDMX
 */
export const getCdmxTimeString = (
  date: Date | string | number = new Date(),
  includeSeconds = true
): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIMEZONE_CDMX,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false,
  }).format(d);
};

/**
 * Formatea una fecha para visualización en pantallas industriales (ej. "25 oct 2026")
 */
export const formatDateCdmx = (
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
): string => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIMEZONE_CDMX,
    ...options,
  }).format(d);
};

/**
 * Formatea fecha y hora completa en horario CDMX (ej. "25/10/2026, 09:30 hrs")
 */
export const formatDateTimeCdmx = (
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }
): string => {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: TIMEZONE_CDMX,
    ...options,
  }).format(d);
};

/**
 * Retorna las partes horarias en CDMX
 */
export const getCdmxDateParts = (date: Date | string | number = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_CDMX,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const map: Record<string, number> = {};
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
 * Determina el turno industrial actual en base al horario de CDMX:
 * - Turno 1: 06:00:00 a 13:59:59
 * - Turno 2: 14:00:00 a 21:59:59
 * - Turno 3: 22:00:00 a 05:59:59
 */
export const getCdmxShift = (date: Date | string | number = new Date()) => {
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
