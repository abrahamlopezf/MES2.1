'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { samePreparedQueueBatch, selectNextQueueForBatch } = require('./queueBatchRules');

test('auto-advance batch membership requires same preparation, formula, and output variant', () => {
  const base = { process_preparation_id: 10, formula_id: 7, output_pti_product_id: 22, output_pti_color: 'Azul' };
  assert.equal(samePreparedQueueBatch(base, { ...base, id: 2 }), true);
  assert.equal(samePreparedQueueBatch(base, { ...base, process_preparation_id: 11 }), false);
  assert.equal(samePreparedQueueBatch(base, { ...base, formula_id: 8 }), false);
  assert.equal(samePreparedQueueBatch(base, { ...base, output_pti_product_id: 23 }), false);
  assert.equal(samePreparedQueueBatch(base, { ...base, output_pti_color: 'Rojo' }), false);
  assert.equal(samePreparedQueueBatch({ ...base, process_preparation_id: null }, { ...base, process_preparation_id: null }), false);
});

test('auto-advance ignores higher-priority independent mixes and does not activate the next separate preparation', () => {
  const active = { id: 1, process_preparation_id: 10, formula_id: 7, output_pti_product_id: 22, output_pti_color: 'Azul' };
  const sameBatch = { id: 2, priority: 1, ...active };
  const higherPriorityDifferentMix = { id: 3, priority: 99, process_preparation_id: 12, formula_id: 9, output_pti_product_id: 33, output_pti_color: 'Rojo' };
  const sameFormulaSeparateBatch = { id: 4, priority: 50, process_preparation_id: 13, formula_id: 7, output_pti_product_id: 22, output_pti_color: 'Azul' };

  assert.equal(selectNextQueueForBatch([higherPriorityDifferentMix, sameFormulaSeparateBatch, sameBatch], active)?.id, sameBatch.id);
  assert.equal(selectNextQueueForBatch([higherPriorityDifferentMix, sameFormulaSeparateBatch], active), null);
});
