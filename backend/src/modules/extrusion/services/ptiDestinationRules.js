'use strict';

const DESTINATION_LABELS = Object.freeze({
  TELARES_ROLLO: 'Tejido Tela',
  TELARES_BANDA: 'Telares Banda',
  CORTE_BANDA: 'Corte de banda',
  CORTE_CINTA: 'Corte de cinta',
  ALMACEN: 'Almacén general',
  VENTA: 'Venta (salida restringida)',
});

function getCompatibleDestinationOptions({ extruderNumber, denier }) {
  const machine = Number(extruderNumber);
  if (!Number.isInteger(machine) || machine < 1) return [];
  // Extrusión solo entrega PTI a la subárea de Telares que le corresponde.
  // Los destinos posteriores se deciden al terminar el rollo/banda en Telares.
  if (machine === 1) return ['TELARES_BANDA'];
  if (machine > 1) return ['TELARES_ROLLO'];
  return [];
}

function validatePtiDestination({ extruderNumber }) {
  const allowed = getCompatibleDestinationOptions({ extruderNumber });
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
