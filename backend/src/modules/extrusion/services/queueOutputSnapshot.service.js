'use strict';

const snapshotSchemaByConnection = new WeakMap();

async function supportsOutputSnapshots(sequelize, transaction = null) {
  if (snapshotSchemaByConnection.has(sequelize)) return snapshotSchemaByConnection.get(sequelize);

  let supported = false;
  try {
    const columns = await sequelize.getQueryInterface().describeTable('extruder_queues', { transaction });
    supported = Boolean(columns.output_pti_product_id && columns.output_pti_color);
  } catch (_) {
    // Keep the queue endpoint available on databases awaiting this additive migration.
    supported = false;
  }
  snapshotSchemaByConnection.set(sequelize, supported);
  return supported;
}

async function fetchQueueOutputSnapshots(sequelize, queueIds, transaction = null) {
  const ids = [...new Set((queueIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length || !(await supportsOutputSnapshots(sequelize, transaction))) return new Map();

  const rows = await sequelize.query(
    'SELECT id, output_pti_product_id, output_pti_color FROM extruder_queues WHERE id IN (:ids)',
    { replacements: { ids }, type: sequelize.QueryTypes.SELECT, transaction },
  );
  return new Map(rows.map((row) => [Number(row.id), row]));
}

async function persistQueueOutputSnapshot(sequelize, queueId, product, transaction = null, outputColor = null) {
  if (!product || !(await supportsOutputSnapshots(sequelize, transaction))) return false;
  await sequelize.query(
    'UPDATE extruder_queues SET output_pti_product_id = :productId, output_pti_color = :color WHERE id = :queueId',
    {
      replacements: {
        productId: product.id || null,
        color: outputColor || product.color || null,
        queueId: Number(queueId),
      },
      transaction,
    },
  );
  return true;
}

module.exports = { fetchQueueOutputSnapshots, persistQueueOutputSnapshot, supportsOutputSnapshots };
