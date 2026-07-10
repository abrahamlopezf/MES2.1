export const MATERIAL_TYPE_LABELS = {
  MATERIA_PRIMA: 'Materia prima',
  MATERIA_SECUNDARIA: 'Materia secundaria',
  MATERIAL_GENERAL: 'Material general',
};

export const MATERIAL_TYPE_DESCRIPTIONS = {
  MATERIA_PRIMA: 'Material principal usado directamente en producción.',
  MATERIA_SECUNDARIA: 'Material complementario usado en procesos productivos.',
  MATERIAL_GENERAL: 'Material de apoyo, consumo o uso general.',
};

export const MATERIAL_TYPE_TONES = {
  MATERIA_PRIMA: 'primary',
  MATERIA_SECUNDARIA: 'success',
  MATERIAL_GENERAL: 'warning',
};

export const MATERIAL_UNIT_LABELS = {
  KG: 'Kilogramo',
  PIEZA: 'Pieza',
  METRO: 'Metro',
  LITRO: 'Litro',
  ROLLO: 'Rollo',
  CAJA: 'Caja',
  PAQUETE: 'Paquete',
};

export const MATERIAL_TYPE_OPTIONS = [
  { value: 'MATERIA_PRIMA', label: 'Materia prima' },
  { value: 'MATERIA_SECUNDARIA', label: 'Materia secundaria' },
  { value: 'MATERIAL_GENERAL', label: 'Material general' },
];

export const MATERIAL_UNIT_OPTIONS = [
  { value: 'KG', label: 'Kilogramo' },
  { value: 'PIEZA', label: 'Pieza' },
  { value: 'METRO', label: 'Metro' },
  { value: 'LITRO', label: 'Litro' },
  { value: 'ROLLO', label: 'Rollo' },
  { value: 'CAJA', label: 'Caja' },
  { value: 'PAQUETE', label: 'Paquete' },
];

export const MATERIAL_STATUS_OPTIONS = [
  { value: 'active', label: 'Solo activos' },
  { value: 'all', label: 'Activos e inactivos' },
];

export const getMaterialTypeLabel = (type) => {
  return MATERIAL_TYPE_LABELS[type] || type || 'Sin tipo';
};

export const getMaterialTypeDescription = (type) => {
  return MATERIAL_TYPE_DESCRIPTIONS[type] || 'Tipo de material no identificado.';
};

export const getMaterialTypeTone = (type) => {
  return MATERIAL_TYPE_TONES[type] || 'neutral';
};

export const getMaterialUnitLabel = (unit) => {
  return MATERIAL_UNIT_LABELS[unit] || unit || 'Sin unidad';
};