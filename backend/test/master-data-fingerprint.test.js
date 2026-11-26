const test = require('node:test');
const assert = require('node:assert/strict');
const { MASTER_DATA_TABLES, assertExpectedMasterTables, compareFingerprints } = require('../src/scripts/master-data-fingerprint');

test('fingerprint protects the physical extrusoras_formulas relation', () => {
  assert.ok(MASTER_DATA_TABLES.some(({ table }) => table === 'extrusoras_formulas'));
  assert.ok(!MASTER_DATA_TABLES.some(({ table }) => table === 'extruder_formulas'));
});

test('fingerprint fails closed when any expected master table is missing', () => {
  assert.throws(
    () => assertExpectedMasterTables(['areas', 'extruders'], [{ table: 'areas' }, { table: 'extrusoras_formulas' }]),
    (error) => error.code === 'MASTER_DATA_TABLES_MISSING'
      && error.missingTables.includes('extrusoras_formulas')
  );
});

test('fingerprints with different schema versions cannot compare as identical', () => {
  const tables = [{ table: 'areas', rowCount: 1, sha256: 'same' }];
  const result = compareFingerprints(
    { fingerprintVersion: 1, tables, globalMasterDataSha256: 'same' },
    { fingerprintVersion: 2, tables, globalMasterDataSha256: 'same' }
  );
  assert.equal(result.identical, false);
  assert.equal(result.baselineFingerprintVersion, 1);
  assert.equal(result.currentFingerprintVersion, 2);
});
