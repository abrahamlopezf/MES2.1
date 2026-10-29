'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getClientFormulaKind,
  isClientFormulaAllowedOnMachine,
  selectLeastLoadedMachine,
} = require('../src/modules/extrusion/services/formulaMachinePolicy');

test('las fórmulas F-EXT-1 quedan exclusivas para EXT-01', () => {
  assert.equal(getClientFormulaKind('F-EXT-1-BLANCO'), 'EXTRUDER_1');
  assert.equal(isClientFormulaAllowedOnMachine('F-EXT-1-BLANCO', { code: 'EXT-01', is_active: true, status: 'ACTIVE' }), true);
  assert.equal(isClientFormulaAllowedOnMachine('F-EXT-1-BLANCO', { code: 'EXT-02', is_active: true, status: 'ACTIVE', is_dynamic_member: true }), false);
});

test('las fórmulas generales usan solo extrusoras activas del grupo dinámico', () => {
  const formula = 'F-EXT-VERDE';
  assert.equal(getClientFormulaKind(formula), 'DYNAMIC');
  assert.equal(isClientFormulaAllowedOnMachine(formula, { code: 'EXT-07', is_active: true, status: 'ACTIVE', is_dynamic_member: true }), true);
  assert.equal(isClientFormulaAllowedOnMachine(formula, { code: 'EXT-03', is_active: true, status: 'ACTIVE', is_dynamic_member: false }), false);
  assert.equal(isClientFormulaAllowedOnMachine(formula, { code: 'EXT-08', is_active: true, status: 'MAINTENANCE', is_dynamic_member: true }), false);
});

test('una fórmula fija queda limitada a las extrusoras enlazadas en su ficha', () => {
  const formula = { code: 'F-EXT-VERDE', extruder_assignment_mode: 'FIXED', allowed_extruders: [7] };
  assert.equal(getClientFormulaKind(formula), 'FIXED');
  assert.equal(isClientFormulaAllowedOnMachine(formula, { id: 7, code: 'EXT-07', is_active: true, status: 'ACTIVE', is_dynamic_member: false }), true);
  assert.equal(isClientFormulaAllowedOnMachine(formula, { id: 4, code: 'EXT-04', is_active: true, status: 'ACTIVE', is_dynamic_member: true }), false);
  assert.equal(isClientFormulaAllowedOnMachine(formula, { id: 1, code: 'EXT-01', is_active: true, status: 'ACTIVE' }), false);
});

test('la asignación automática elige la máquina compatible con menor carga y desempata por id', () => {
  const machines = [{ id: 7 }, { id: 4 }, { id: 2 }];
  const queues = [
    { extruder_id: 2 }, { extruder_id: 2 },
    { extruder_id: 4 },
  ];
  assert.equal(selectLeastLoadedMachine(machines, queues).id, 7);
  assert.equal(selectLeastLoadedMachine([{ id: 7 }, { id: 4 }], []).id, 4);
});

