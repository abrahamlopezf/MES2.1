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

  // A route is one selected path for one roll. Alternative paths belong in
  // ProductionBom.allowed_routes as separate arrays; never combine branches
  // such as CUT + LAMINATION + SALE in the same roll route.
  const tail = stages.slice(1);
  const isBanda = ['BANDA', 'CINTA'].includes(kind);
  const validTail = isBanda
    ? [['CORTE'], ['ALMACEN'], ['VENTA']]
    : [
        ['CORTE'],
        ['CORTE', 'CONFECCION'],
        ['LAMINADO'],
        ['LAMINADO', 'CORTE'],
        ['LONAS'],
        ['ALMACEN'],
        ['VENTA'],
      ];
  if (!validTail.some((candidate) => candidate.length === tail.length && candidate.every((stage, index) => stage === tail[index]))) {
    throw Object.assign(
      new Error(isBanda
        ? 'Ruta no válida para Banda/Cintilla. Elige Corte, Almacén o Venta.'
        : 'Ruta no válida para rollo de tela. Elige Corte, Laminado, Laminado → Corte, Lonas, Almacén o Venta.'),
      { statusCode: 400, code: 'INVALID_PRODUCTION_ROUTE' },
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

// Worksheet conversion: width in meters x linear meters x g/m² (33.9 x oz/yd²),
// multiplied by the configured number of fabric layers (normally 2 tubular, 1 flat).
function calculateFabricWeightKg({ meters, widthMeters, ouncesYd2, layerFactor = 1, coefficient = 33.9 }) {
  const length = Number(meters);
  const width = Number(widthMeters);
  const ounces = Number(ouncesYd2);
  const layers = Number(layerFactor);
  const gramsPerSquareMeterPerOunce = Number(coefficient);
  if (![length, width, ounces, layers, gramsPerSquareMeterPerOunce].every(Number.isFinite)
    || length <= 0 || width <= 0 || ounces <= 0 || layers <= 0 || gramsPerSquareMeterPerOunce <= 0) {
    throw Object.assign(new Error('Para estimar el peso se requieren metros, ancho de conversión, onzas y factor de capas mayores a cero.'), { statusCode: 400, code: 'INVALID_FABRIC_WEIGHT_INPUT' });
  }
  const weightKg = (width * length * layers * ounces * gramsPerSquareMeterPerOunce) / 1000;
  return { weight_kg: Number(weightKg.toFixed(3)), grams_per_meter: Number((weightKg * 1000 / length).toFixed(3)) };
}

function estimateBomFabricWeightKg(bom, meters) {
  const widthMeters = Number(bom?.weight_conversion_width_m || 0);
  const ouncesYd2 = Number(bom?.ounces_yd2 || 0);
  const configuredFactor = Number(bom?.weight_conversion_factor || 0);
  if (widthMeters > 0 && ouncesYd2 > 0 && configuredFactor > 0) {
    const layerFactor = configuredFactor;
    return calculateFabricWeightKg({ meters, widthMeters, ouncesYd2, layerFactor }).weight_kg;
  }
  const standardMeters = Number(bom?.standard_output_meters || 0);
  const standardWeight = Number(bom?.output_weight_kg || 0);
  if (standardMeters > 0 && standardWeight > 0) return Number((standardWeight * Number(meters) / standardMeters).toFixed(3));
  const gramsPerMeter = Number(bom?.target_weight_g_per_m || 0);
  return gramsPerMeter > 0 ? Number((gramsPerMeter * Number(meters) / 1000).toFixed(3)) : null;
}

function getTelaresPtiCatalogQr(bom) {
  const code = String(bom?.code || '').trim().toUpperCase();
  return code ? `TELARES-PTI:${code}` : null;
}

function resolveTelaresPtiCatalogQr(qrValue, boms) {
  const scanned = String(qrValue || '').trim().toUpperCase();
  if (!scanned.startsWith('TELARES-PTI:')) return null;
  const code = scanned.slice('TELARES-PTI:'.length).trim();
  return (boms || []).find((bom) => String(bom.code || '').trim().toUpperCase() === code) || null;
}

module.exports = {
  normalizeStageName,
  normalizeProductionRoute,
  validateOperatorMeterCoverage,
  validateOutputMeasures,
  validateOperatorWeightCoverage,
  calculateFabricWeightKg,
  estimateBomFabricWeightKg,
  getTelaresPtiCatalogQr,
  resolveTelaresPtiCatalogQr,
  OPERATOR_METER_TOLERANCE,
};
