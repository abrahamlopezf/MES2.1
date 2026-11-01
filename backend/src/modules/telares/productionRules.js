'use strict';

const OPERATOR_METER_TOLERANCE = 0.01;

function normalizeStageName(stage) {
  const raw = String(stage || '').trim().toUpperCase();
  if (raw === 'ALMACÉN') return 'ALMACEN';
  if (raw === 'VENTA DE ROLLO' || raw === 'VENTA DIRECTA') return 'VENTA';
  if (raw === 'CORTE DE BANDA' || raw === 'CORTE DE CINTA' || raw === 'CORTE DIRECTO') return 'CORTE';
  return raw;
}

function normalizeProductionRoute(route, productKind = 'ROLLO_TELA') {
  const stages = Array.isArray(route)
    ? route.map(normalizeStageName).filter(Boolean)
    : String(route || '').split(',').map(normalizeStageName).filter(Boolean);
  const kind = String(productKind || 'ROLLO_TELA').trim().toUpperCase();
  const validStages = ['TELARES', 'GLOBO', 'LAMINADO', 'CORTE', 'CONFECCION', 'LONAS', 'ALMACEN', 'VENTA'];

  if (
    stages.length < 2
    || stages[0] !== 'TELARES'
    || stages.some((stage) => !validStages.includes(stage))
    || new Set(stages).size !== stages.length
  ) {
    throw Object.assign(
      new Error('La ruta debe iniciar en TELARES, incluir al menos una etapa posterior válida y no repetir etapas.'),
      { statusCode: 400, code: 'INVALID_PRODUCTION_ROUTE' },
    );
  }

  if (stages.includes('GLOBO')) {
    throw Object.assign(
      new Error('Ninguna salida de Telares puede tener Globo en su ruta; selecciona un destino permitido para su subárea.'),
      { statusCode: 400, code: 'GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT' },
    );
  }

  if (['BANDA', 'CINTA'].includes(kind) && (stages.includes('GLOBO') || stages.includes('LAMINADO'))) {
    throw Object.assign(
      new Error('Los productos de Tejido de Banda y Cintilla no pasan por Globo ni Laminado; sus destinos válidos son Corte, Almacén o Venta.'),
      { statusCode: 400, code: 'INVALID_BANDA_CINTA_ROUTE' },
    );
  }

  return stages;
}

function validateOperatorMeterCoverage(segments, totalMeters, tolerance = OPERATOR_METER_TOLERANCE) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw Object.assign(new Error('Registra al menos un tramo de operador para cubrir la producción.'), { statusCode: 400, code: 'OPERATOR_SEGMENTS_REQUIRED' });
  }

  const endMeters = Number(totalMeters);
  if (!Number.isFinite(endMeters) || endMeters <= 0) {
    throw Object.assign(new Error('Los metros totales deben ser mayores a cero para validar los tramos.'), { statusCode: 400, code: 'INVALID_TOTAL_METERS' });
  }

  const ordered = [...segments].sort((left, right) => (
    Number(left.meters_start) - Number(right.meters_start)
    || Number(left.meters_end) - Number(right.meters_end)
  ));
  if (Math.abs(Number(ordered[0].meters_start)) > tolerance) {
    throw Object.assign(new Error('Los tramos de operador deben comenzar en el metro 0.'), { statusCode: 400, code: 'OPERATOR_SEGMENT_GAP' });
  }

  for (let index = 1; index < ordered.length; index += 1) {
    const difference = Number(ordered[index].meters_start) - Number(ordered[index - 1].meters_end);
    if (difference > tolerance) {
      throw Object.assign(new Error(`Hay metros sin operador asignado entre ${ordered[index - 1].meters_end} y ${ordered[index].meters_start}.`), { statusCode: 400, code: 'OPERATOR_SEGMENT_GAP' });
    }
    if (difference < -tolerance) {
      throw Object.assign(new Error(`Los tramos de operador se traslapan entre ${ordered[index].meters_start} y ${ordered[index - 1].meters_end}.`), { statusCode: 400, code: 'OPERATOR_SEGMENT_OVERLAP' });
    }
  }

  const lastSegmentEnd = Number(ordered[ordered.length - 1].meters_end);
  if (Math.abs(lastSegmentEnd - endMeters) > tolerance) {
    throw Object.assign(new Error(`Los tramos deben cubrir la producción hasta ${endMeters} m.`), { statusCode: 400, code: 'OPERATOR_SEGMENT_GAP' });
  }

  return true;
}

function validateOutputMeasures(meters, weightKg) {
  const normalizedMeters = Number(meters);
  const normalizedWeightKg = Number(weightKg);
  if (!Number.isFinite(normalizedMeters) || normalizedMeters <= 0) {
    throw Object.assign(new Error('Registra los metros reales de la salida (mayores a cero).'), { statusCode: 400, code: 'OUTPUT_METERS_REQUIRED' });
  }
  if (!Number.isFinite(normalizedWeightKg) || normalizedWeightKg <= 0) {
    throw Object.assign(new Error('Registra el peso real de la salida (mayor a cero).'), { statusCode: 400, code: 'OUTPUT_WEIGHT_REQUIRED' });
  }
  return { meters: normalizedMeters, weight_kg: normalizedWeightKg };
}

function validateOperatorWeightCoverage(segments, totalWeightKg, tolerance = 0.01) {
  const withWeight = (segments || []).filter((segment) => (
    segment.weight_start_kg != null || segment.weight_end_kg != null
  ));
  if (!withWeight.length) return true;
  if (withWeight.length !== segments.length) {
    throw Object.assign(new Error('Si capturas rangos de peso, todos los tramos deben tenerlos.'), { statusCode: 400, code: 'OPERATOR_WEIGHT_COVERAGE_REQUIRED' });
  }

  const total = Number(totalWeightKg);
  if (!Number.isFinite(total) || total <= 0) {
    throw Object.assign(new Error('El peso total debe ser mayor a cero para validar los tramos.'), { statusCode: 400, code: 'INVALID_TOTAL_WEIGHT' });
  }
  const ordered = [...withWeight].sort((left, right) => (
    Number(left.weight_start_kg) - Number(right.weight_start_kg)
    || Number(left.weight_end_kg) - Number(right.weight_end_kg)
  ));
  if (Math.abs(Number(ordered[0].weight_start_kg)) > tolerance) {
    throw Object.assign(new Error('Los tramos de peso deben comenzar en 0 kg.'), { statusCode: 400, code: 'OPERATOR_WEIGHT_GAP' });
  }
  for (let index = 1; index < ordered.length; index += 1) {
    const gap = Number(ordered[index].weight_start_kg) - Number(ordered[index - 1].weight_end_kg);
    if (gap > tolerance) throw Object.assign(new Error('Hay un rango de peso sin operador asignado.'), { statusCode: 400, code: 'OPERATOR_WEIGHT_GAP' });
    if (gap < -tolerance) throw Object.assign(new Error('Los rangos de peso de operadores se traslapan.'), { statusCode: 400, code: 'OPERATOR_WEIGHT_OVERLAP' });
  }
  if (Math.abs(Number(ordered[ordered.length - 1].weight_end_kg) - total) > tolerance) {
    throw Object.assign(new Error(`Los tramos deben cubrir el peso producido hasta ${total} kg.`), { statusCode: 400, code: 'OPERATOR_WEIGHT_GAP' });
  }
  return true;
}

module.exports = {
  normalizeStageName,
  normalizeProductionRoute,
  validateOperatorMeterCoverage,
  validateOutputMeasures,
  validateOperatorWeightCoverage,
  OPERATOR_METER_TOLERANCE,
};
