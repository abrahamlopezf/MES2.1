require('dotenv').config();
const { ConsumptionOrder, ConsumptionOrderItem, Lote, QrCode, QrBatch, WipInventory } = require('../database/models');
const { Op } = require('sequelize');

async function backfill() {
  console.log('--- Iniciando Backfill de QRs Hijos para Items de ODC ---');

  const items = await ConsumptionOrderItem.findAll({
    where: {
      lote_id: { [Op.ne]: null },
      child_qr_id: null
    },
    include: [
      {
        model: Lote,
        as: 'lote',
        include: [{ model: QrCode, as: 'qr_code' }]
      },
      {
        model: ConsumptionOrder,
        as: 'order'
      }
    ],
    order: [['order_id', 'ASC'], ['id', 'ASC']]
  });

  console.log(`Encontrados ${items.length} items con lote pero sin child_qr_id.`);

  let batch = await QrBatch.findOne();
  if (!batch) {
    batch = await QrBatch.create({
      batch_number: 'BATCH-ORD-AUTO',
      total_qrs: 10000,
      type: 'CONSUMPTION_ORDER',
      created_by: 1
    });
  }

  let createdCount = 0;

  for (const item of items) {
    const lote = item.lote;
    const order = item.order;
    if (!lote || !order) continue;

    let parentQrCode = lote.qr_code?.qr_code;
    if (!parentQrCode && lote.qr_id) {
      const qrRec = await QrCode.findByPk(lote.qr_id);
      if (qrRec) parentQrCode = qrRec.qr_code;
    }
    const parentNomenclature = parentQrCode || lote.folio || `LOT-${lote.id}`;

    // Contar cuántos QRs hijos existen para este lote padre
    const existingChildCount = await ConsumptionOrderItem.count({
      where: { lote_id: lote.id, child_qr_id: { [Op.ne]: null } }
    });
    let snNumber = existingChildCount + 1;
    let childQrString = `${parentNomenclature}-SN${snNumber}`;

    while (await QrCode.findOne({ where: { qr_code: childQrString } })) {
      snNumber++;
      childQrString = `${parentNomenclature}-SN${snNumber}`;
    }

    const isSurtida = order.status === 'SURTIDA';

    const childQr = await QrCode.create({
      serial: Date.now() + Math.floor(Math.random() * 100000),
      qr_code: childQrString,
      batch_id: batch.id,
      purpose: 'WIP_PROCESS_INPUT',
      assigned_area_id: order.requesting_area_id || 2,
      status: isSurtida ? 'IN_WIP' : 'RESERVED_ORDER',
      created_by: order.requested_by || 1,
      is_active: isSurtida
    });

    item.child_qr_id = childQr.id;
    await item.save();

    // Si la orden ya estaba SURTIDA y el área es de proceso (ej. Extrusión 2), asegurar registro en WipInventory
    if (isSurtida && order.requesting_area_id === 2) {
      const qty = Number(item.fulfilled_quantity || item.requested_quantity || 0);
      const wipExisting = await WipInventory.findOne({
        where: { qr_code_id: childQr.id, area_id: 2 }
      });
      if (!wipExisting) {
        await WipInventory.create({
          material_id: item.material_id,
          lote_id: item.lote_id,
          qr_code_id: childQr.id,
          area_id: 2,
          amount: qty
        });
      }
    }

    createdCount++;
    console.log(`[OK] Item ${item.id} (Orden ${order.order_number}) -> QR Hijo creado: ${childQrString}`);
  }

  console.log(`--- Backfill concluido: ${createdCount} QRs hijos generados y vinculados ---`);
  process.exit(0);
}

backfill().catch(err => {
  console.error('Error en backfill:', err);
  process.exit(1);
});
