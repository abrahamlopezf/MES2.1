'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { splitQuantityEqually } = require('./splitQuantityEqually');

test('splits 500 kg evenly across three containers at persisted kilogram precision', () => {
  const result = splitQuantityEqually(500, 3);

  assert.deepEqual(result, [166.667, 166.667, 166.666]);
  assert.equal(result.reduce((sum, value) => sum + value, 0), 500);
});

test('conserves the source quantity for one and evenly divisible container counts', () => {
  assert.deepEqual(splitQuantityEqually(500, 1), [500]);
  assert.deepEqual(splitQuantityEqually(500, 2), [250, 250]);
  assert.deepEqual(splitQuantityEqually(500, 4), [125, 125, 125, 125]);
});

test('distributes fractional remainder units without losing the rounded source quantity', () => {
  const result = splitQuantityEqually(1, 6, 2);

  assert.deepEqual(result, [0.17, 0.17, 0.17, 0.17, 0.16, 0.16]);
  assert.equal(Number(result.reduce((sum, value) => sum + value, 0).toFixed(2)), 1);
});

test('rejects invalid totals, counts, and precision', () => {
  assert.throws(() => splitQuantityEqually(0, 1), /total/);
  assert.throws(() => splitQuantityEqually(500, 0), /count/);
  assert.throws(() => splitQuantityEqually(500, 2.5), /count/);
  assert.throws(() => splitQuantityEqually(500, 2, 10), /precision/);
});
