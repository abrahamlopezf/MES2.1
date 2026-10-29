'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  fetchQueueOutputSnapshots,
  persistQueueOutputSnapshot,
} = require('../src/modules/extrusion/services/queueOutputSnapshot.service');

test('la cola sigue disponible cuando la migración opcional de snapshots está pendiente', async () => {
  let queryCalled = false;
  const sequelize = {
    QueryTypes: { SELECT: 'SELECT' },
    getQueryInterface: () => ({ describeTable: async () => ({ id: { type: 'INTEGER' } }) }),
    query: async () => { queryCalled = true; throw new Error('No debe consultar columnas inexistentes'); },
  };

  assert.equal((await fetchQueueOutputSnapshots(sequelize, [10])).size, 0);
  assert.equal(await persistQueueOutputSnapshot(sequelize, 10, { id: 2, color: 'Azul' }), false);
  assert.equal(queryCalled, false);
});

test('lee y persiste el snapshot cuando las columnas están instaladas', async () => {
  const calls = [];
  const sequelize = {
    QueryTypes: { SELECT: 'SELECT' },
    getQueryInterface: () => ({ describeTable: async () => ({
      id: { type: 'INTEGER' },
      output_pti_product_id: { type: 'INTEGER' },
      output_pti_color: { type: 'VARCHAR(100)' },
    }) }),
    query: async (sql, options) => {
      calls.push({ sql, options });
      return sql.startsWith('SELECT') ? [{ id: 10, output_pti_product_id: 2, output_pti_color: 'Azul' }] : [];
    },
  };

  const snapshots = await fetchQueueOutputSnapshots(sequelize, [10]);
  assert.deepEqual(snapshots.get(10), { id: 10, output_pti_product_id: 2, output_pti_color: 'Azul' });
  assert.equal(await persistQueueOutputSnapshot(sequelize, 10, { id: 2, color: 'Azul' }), true);
  assert.equal(calls.length, 2);
});
