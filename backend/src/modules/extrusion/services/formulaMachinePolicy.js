'use strict';

const GENERAL_CLIENT_FORMULA_CODES = new Set([
  'F-EXT-LIQ-ROJO', 'F-EXT-LIQ-NEGRO', 'F-EXT-2-BLANCA', 'F-EXT-4-BLANCA',
  'F-EXT-5-BLANCA', 'F-EXT-AZUL', 'F-EXT-VERDE', 'F-EXT-MORADO', 'F-EXT-ROJO',
  'F-EXT-NEGRO', 'F-EXT-VERDE-OPT', 'F-EXT-AMARILLO-ANTI', 'F-EXT-NATURAL',
]);

const isCustomClientFormula = (code) => String(code || '').trim().toUpperCase().startsWith('F-EXT-CUSTOM-');

const getClientFormulaKind = (formulaOrCode) => {
  const code = String(typeof formulaOrCode === 'string' ? formulaOrCode : formulaOrCode?.code || '').trim().toUpperCase();
  if (code.startsWith('F-EXT-1-')) return 'EXTRUDER_1';
  if (GENERAL_CLIENT_FORMULA_CODES.has(code) || isCustomClientFormula(code)) {
    const mode = String(typeof formulaOrCode === 'string' ? '' : formulaOrCode?.extruder_assignment_mode || '').toUpperCase();
    return mode === 'FIXED' ? 'FIXED' : 'DYNAMIC';
  }
  return null;
};

const isClientFormulaAllowedOnMachine = (formulaOrCode, machine) => {
  const kind = getClientFormulaKind(formulaOrCode);
  if (!kind) return null;
  if (!machine || machine.is_active === false || machine.status !== 'ACTIVE') return false;
  if (kind === 'EXTRUDER_1') return machine.code === 'EXT-01';
  if (machine.code === 'EXT-01' || machine.code === 'EXT-LIQ') return false;
  if (kind === 'FIXED') {
    const allowedExtruders = Array.isArray(typeof formulaOrCode === 'string' ? null : formulaOrCode?.allowed_extruders)
      ? formulaOrCode.allowed_extruders.map(Number)
      : [];
    return allowedExtruders.includes(Number(machine.id));
  }
  return machine.is_dynamic_member === true;
};

const selectLeastLoadedMachine = (machines = [], queues = []) => {
  const loads = new Map();
  queues.forEach((queue) => {
    const id = Number(queue.extruder_id);
    loads.set(id, (loads.get(id) || 0) + 1);
  });
  return [...machines].sort((a, b) =>
    (loads.get(Number(a.id)) || 0) - (loads.get(Number(b.id)) || 0) || Number(a.id) - Number(b.id)
  )[0] || null;
};

module.exports = { GENERAL_CLIENT_FORMULA_CODES, isCustomClientFormula, getClientFormulaKind, isClientFormulaAllowedOnMachine, selectLeastLoadedMachine };
