export const QR_STATUS_LABELS = {
  GENERADO: 'Generado',
  DISPONIBLE: 'Disponible',
  EN_USO: 'En uso',
  TRANSFERIDO: 'Transferido',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
  DANADO: 'Dañado',
};

export const QR_STATUS_DESCRIPTIONS = {
  GENERADO: 'Código creado, pendiente de asignación.',
  DISPONIBLE: 'Código listo para ser usado en operación.',
  EN_USO: 'Código vinculado a una operación activa.',
  TRANSFERIDO: 'Código transferido a otra área o proceso.',
  FINALIZADO: 'Código finalizado dentro del flujo operativo.',
  CANCELADO: 'Código cancelado y no disponible.',
  DANADO: 'Código marcado como dañado.',
};

export const QR_STATUS_TONES = {
  GENERADO: 'neutral',
  DISPONIBLE: 'success',
  EN_USO: 'primary',
  TRANSFERIDO: 'warning',
  FINALIZADO: 'success',
  CANCELADO: 'danger',
  DANADO: 'danger',
};

export const QR_STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'GENERADO', label: 'Generado' },
  { value: 'DISPONIBLE', label: 'Disponible' },
  { value: 'EN_USO', label: 'En uso' },
  { value: 'TRANSFERIDO', label: 'Transferido' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'DANADO', label: 'Dañado' },
];

export const QR_EVENT_LABELS = {
  GENERATED: 'Generado',
  ASSIGNED: 'Asignado',
  VALIDATED: 'Validado',
  CANCELLED: 'Cancelado',
  DAMAGED: 'Dañado',
  USED: 'Usado',
  TRANSFERRED: 'Transferido',
  FINALIZED: 'Finalizado',
};

export const getQrStatusLabel = (status) => {
  return QR_STATUS_LABELS[status] || status || 'Sin estado';
};

export const getQrStatusDescription = (status) => {
  return QR_STATUS_DESCRIPTIONS[status] || 'Estado no identificado.';
};

export const getQrStatusTone = (status) => {
  return QR_STATUS_TONES[status] || 'neutral';
};

export const getQrEventLabel = (eventType) => {
  return QR_EVENT_LABELS[eventType] || eventType || 'Evento';
};