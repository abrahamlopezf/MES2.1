'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const migration = require('./20261104160000-backfill-unambiguous-queue-output-snapshots');

test('queue backfill uses the prepared-container snapshot and avoids current formula inference', async () => {
  let capturedSql = '';
  const queryInterface = {
    sequelize: {
      query: async (sql) => { capturedSql = sql; },
    },
  };

  await migration.up(queryInterface);

  assert.match(capturedSql, /traceable_items ti/i);
  assert.match(capturedSql, /output_pti_product_id/i);
  assert.match(capturedSql, /HAVING COUNT\(DISTINCT/i);
  assert.match(capturedSql, /q\.output_pti_product_id IS NULL/i);
  assert.doesNotMatch(capturedSql, /GROUP BY formula_id/i);
});
