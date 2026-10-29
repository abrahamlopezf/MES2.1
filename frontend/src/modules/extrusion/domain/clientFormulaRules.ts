const GENERAL_CLIENT_FORMULA_CODES = new Set([
  'F-EXT-LIQ-ROJO',
  'F-EXT-LIQ-NEGRO',
  'F-EXT-2-BLANCA',
  'F-EXT-4-BLANCA',
  'F-EXT-5-BLANCA',
  'F-EXT-AZUL',
  'F-EXT-VERDE',
  'F-EXT-MORADO',
  'F-EXT-ROJO',
  'F-EXT-NEGRO',
  'F-EXT-VERDE-OPT',
  'F-EXT-AMARILLO-ANTI',
  'F-EXT-NATURAL',
]);

type FormulaRuleTarget = string | {
  code?: string | null;
  extruder_assignment_mode?: string | null;
  allowed_extruders?: Array<number | string>;
};

export const isClientFormula = (code?: string | null): boolean => {
  const normalized = String(code || '').trim().toUpperCase();
  return normalized.startsWith('F-EXT-1-') || normalized.startsWith('F-EXT-CUSTOM-') || GENERAL_CLIENT_FORMULA_CODES.has(normalized);
};

export const getClientFormulaKind = (formula?: FormulaRuleTarget | null): 'EXTRUDER_1' | 'DYNAMIC' | 'FIXED' | null => {
  const normalized = String(typeof formula === 'string' ? formula : formula?.code || '').trim().toUpperCase();
  if (normalized.startsWith('F-EXT-1-')) return 'EXTRUDER_1';
  if (GENERAL_CLIENT_FORMULA_CODES.has(normalized) || normalized.startsWith('F-EXT-CUSTOM-')) {
    return String(typeof formula === 'string' ? '' : formula?.extruder_assignment_mode || '').toUpperCase() === 'FIXED' ? 'FIXED' : 'DYNAMIC';
  }
  return null;
};

export const getClientAllowedExtruders = (formula?: FormulaRuleTarget | null, dynamicExtruderIds: number[] = []): number[] | null => {
  const kind = getClientFormulaKind(formula);
  if (kind === 'EXTRUDER_1') return [1];
  if (kind === 'DYNAMIC') return [...new Set(dynamicExtruderIds.map(Number).filter(Number.isInteger))];
  if (kind === 'FIXED') {
    const ids = typeof formula === 'string' ? [] : formula?.allowed_extruders || [];
    return [...new Set(ids.map(Number).filter(Number.isInteger))];
  }
  return null;
};

export const getClientTargetLabel = (formula?: FormulaRuleTarget | null): string | null => {
  const kind = getClientFormulaKind(formula);
  if (kind === 'EXTRUDER_1') return 'Extrusora 1 (exclusiva)';
  if (kind === 'DYNAMIC') return 'Grupo dinámico de extrusoras';
  if (kind === 'FIXED') {
    const ids = typeof formula === 'string' ? [] : formula?.allowed_extruders || [];
    return `Fija: ${ids.map((id: number) => `Extrusora ${id}`).join(', ') || 'sin extrusoras enlazadas'}`;
  }
  return null;
};
