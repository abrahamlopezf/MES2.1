'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('crear solicitud de proceso consulta ficha maestra sin exigir bloqueo de escritura', async () => {
  const models = require('../src/database/models');
  const corte = require('../src/modules/corte/corte.service');
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const originalTransaction = models.sequelize.transaction;
  const originalFindByPk = models.LaminadoSpecification.findByPk;
  const originalCreate = models.CorteLaminadoOrder.create;
  const originalBulkCreate = models.CorteLaminadoOrderItem.bulkCreate;
  let savedOrder;
  let savedItems;

  models.sequelize.transaction = async (callback) => callback(transaction);
  models.LaminadoSpecification.findByPk = async (id, options) => {
    assert.equal(id, 4);
    assert.equal(options.transaction, transaction);
    assert.equal(options.lock, undefined, 'una ficha Master Data de solo lectura no debe usar FOR UPDATE');
    return { id: 4, is_active: true, code: 'QA-LAM-04', output_pti_code: 'QA-PTI-04', output_product_name: 'PTI QA' };
  };
  models.CorteLaminadoOrder.create = async (attributes, options) => {
    assert.equal(options.transaction, transaction);
    savedOrder = { ...attributes, id: 9001, update: async (values, updateOptions) => {
      assert.equal(updateOptions.transaction, transaction);
      Object.assign(savedOrder, values);
    } };
    return savedOrder;
  };
  models.CorteLaminadoOrderItem.bulkCreate = async (rows, options) => {
    assert.equal(options.transaction, transaction);
    savedItems = rows;
    return rows;
  };

  try {
    const result = await corte.createProcessOrder({
      destinationAreaCode: 'LAMINADO', specificationId: 4, requestedRollCount: 1, requestedBy: 61,
    });
    assert.equal(result.id, 9001);
    assert.equal(result.status, 'REQUESTED');
    assert.equal(savedOrder.requested_by, 61);
    assert.equal(savedItems.length, 1);
    assert.equal(savedItems[0].roll_id, null, 'la solicitud no debe asignar un rollo antes de su escaneo');
  } finally {
    models.sequelize.transaction = originalTransaction;
    models.LaminadoSpecification.findByPk = originalFindByPk;
    models.CorteLaminadoOrder.create = originalCreate;
    models.CorteLaminadoOrderItem.bulkCreate = originalBulkCreate;
  }
});
