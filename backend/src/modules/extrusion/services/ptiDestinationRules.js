'use strict';

const DESTINATION_LABELS = Object.freeze({
  TELARES_ROLLO: 'Tejido Tela',
  TELARES_BANDA: 'Telares Banda',
  CORTE_BANDA: 'Corte de banda',
  CORTE_CINTA: 'Corte de cinta',
  ALMACEN: 'Almacén general',
  VENTA: 'Venta (salida restringida)',
});

function getCompatibleDestinationOptions({ extruderNumber, telaresSubareaCode }) {
  const machine = Number(extruderNumber);
  if (!Number.isInteger(machine) || machine < 1) return [];
  // Prefer explicit machine routing. Number-based mapping remains only for
  // legacy rows created before routing was configurable in the machine catalog.
  const configured = String(telaresSubareaCode || '').trim().toUpperCase();
  if (configured === 'TELARES_BANDA' || configured === 'TELARES_ROLLO') return [configured];
  if (configured === 'NO_APLICA') return [];
  if (machine === 1) return ['TELARES_BANDA'];
  if ([2, 4, 5].includes(machine)) return ['TELARES_ROLLO'];
  return [];
}

function validatePtiDestination({ extruderNumber, telaresSubareaCode }) {
  const allowed = getCompatibleDestinationOptions({ extruderNumber, telaresSubareaCode });
  if (!allowed.length) {
    throw Object.assign(
      new Error('No se pudo determinar la subárea de Telares para este PTI. Revisa la extrusora de referencia en el catálogo.'),
      { statusCode: 409, code: 'PTI_TELARES_SUBAREA_UNRESOLVED' },
    );
  }
  return allowed[0];
}

module.exports = {
  DESTINATION_LABELS,
  getCompatibleDestinationOptions,
  validatePtiDestination,
};
