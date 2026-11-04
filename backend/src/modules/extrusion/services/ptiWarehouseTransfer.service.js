const { sequelize } = require('../../../config/database');
const db = require('../../../database/models');
const { Op } = require('sequelize');

const fail = (message, statusCode = 409) => Object.assign(new Error(message), { statusCode });
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));
const roleCode = (user) => String(user?.role?.code || user?.role?.name || user?.role || '').toUpperCase();

const assertRole = (user, allowed) => {
  if (!allowed.includes(roleCode(user))) throw fail('No tienes permiso para operar esta transferencia.', 403);
};

const parseQuantity = ({ rack, quantity_pieces, weight_kg, actualRackKg }) => {
  const availablePieces = Number(rack.current_quantity || 0);
  const unitWeight = Number(actualRackKg) / availablePieces;
  if (!(unitWeight > 0)) throw fail('El rack no tiene peso unitario confiable. Regístralo antes de transferir PTI.');
  const hasPieces = quantity_pieces !== undefined && quantity_pieces !== null && quantity_pieces !== '';
  const hasWeight = weight_kg !== undefined && weight_kg !== null && weight_kg !== '';
  if (hasPieces === hasWeight) throw fail('Captura una sola cantidad: piezas o peso.');
  let pieces;
  if (hasPieces) {
    pieces = Number(quantity_pieces);
    if (!Number.isInteger(pieces) || pieces <= 0) throw fail('La cantidad de piezas debe ser un entero mayor a cero.', 400);
  } else {
    const kg = Number(weight_kg);
    if (!Number.isFinite(kg) || kg <= 0) throw fail('El peso debe ser mayor a cero.', 400);
    const exactPieces = kg / unitWeight;
    pieces = Math.round(exactPieces);
    if (Math.abs(exactPieces - pieces) > 0.001) throw fail(`El peso debe corresponder a bobinas completas (peso unitario: ${unitWeight} kg).`, 400);
  }
  if (pieces > availablePieces) throw fail(`El rack solo tiene ${availablePieces} piezas disponibles.`);
  const kg = pieces === availablePieces ? round(actualRackKg) : round(pieces * unitWeight);
  return { pieces, kg, unitWeight };
};

const normalizeUnit = (unit) => {
  const code = String(unit?.code || '').trim().toUpperCase();
  if (['KG', 'KGS', 'KILO', 'KILOGRAMO'].includes(code)) return { code: 'KG', multiplier: 1 };
  if (['PZA', 'PZ', 'PIEZA', 'PIEZAS', 'UND', 'UNIDAD', 'ROLLO', 'BOBINA'].includes(code)) return { code: 'PZA', multiplier: null };
  throw fail(`La unidad base ${code || '(sin unidad)'} no permite una conversión segura de PTI a Almacén. Configura KG o PZA.`);
};

const createTransferQr = async ({ userId, warehouseAreaId, transferCode, transaction }) => {
  const batch = await db.QrBatch.create({
    batch_code: `BATCH-${transferCode}`,
    quantity: 1,
    assigned_area_id: warehouseAreaId,
    status: 'AVAILABLE',
    notes: 'QR de transferencia de PTI de Extrusión a Almacén.',
    created_by: userId,
  }, { transaction });
  const qrCode = await db.QrCode.create({
    serial: Date.now() * 100 + Math.floor(Math.random() * 100),
    qr_code: transferCode,
    batch_id: batch.id,
    purpose: 'EXTRUSION_PTI_WAREHOUSE_TRANSFER',
    assigned_area_id: warehouseAreaId,
    status: 'IN_USE',
    is_active: true,
    created_by: userId,
  }, { transaction });
  return qrCode;
};

const dispatchToWarehouse = async (payload, user) => {
  assertRole(user, ['SUPERADMIN', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION']);
  return sequelize.transaction(async (transaction) => {
    const rackId = Number(payload.rack_id) || 0;
    const rackIdentifier = String(payload.rack_qr || '').trim();
    if (!rackId && !rackIdentifier) throw fail('Selecciona o escanea el rack que se enviará a Almacén.', 400);
    const rack = await db.PtiRack.findOne({
      where: rackId ? { id: rackId } : { [Op.or]: [{ qr_code: rackIdentifier }, { rack_code: rackIdentifier }] },
      include: [{ model: db.PtiProduct, as: 'currentPtiProduct' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!rack) throw fail('No se encontró el rack de Extrusión.', 404);
    if (Number(rack.current_quantity) <= 0 || !rack.current_pti_product_id) throw fail('El rack está vacío.');
    if (rack.destination_route !== 'ALMACEN') throw fail('Este rack no está destinado a Almacén. Su ruta asignada es ' + (rack.destination_route || 'sin ruta') + '.');
    const ptiProduct = rack.currentPtiProduct;
    if (!ptiProduct?.material_id) throw fail('El PTI no tiene material de inventario asociado. Completa su enlace con el catálogo de Almacén antes de transferirlo.');
    const [sourceArea, warehouseArea, material, sourceQr] = await Promise.all([
      db.Area.findOne({ where: { code: 'EXTRUSION', is_active: true }, transaction }),
      db.Area.findOne({ where: { code: 'ALMACEN', is_active: true }, transaction }),
      db.Material.findByPk(ptiProduct.material_id, { include: [{ model: db.MaterialUnit, as: 'base_unit' }], transaction }),
      db.QrCode.findOne({ where: { qr_code: rack.qr_code }, transaction, lock: transaction.LOCK.UPDATE }),
    ]);
    if (!sourceArea || !warehouseArea) throw fail('No se encontraron las áreas activas de Extrusión y Almacén.');
    if (!material) throw fail('El material de inventario ligado al PTI no existe.');
    const unit = normalizeUnit(material.base_unit);
    if (!sourceQr) throw fail('El QR del rack no existe; no se puede conservar la trazabilidad.');
    const sourceTraceable = await db.TraceableItem.findOne({ where: { qr_code_id: sourceQr.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!sourceTraceable) throw fail('El rack no tiene un saldo trazable asociado. Actualiza o concilia el WIP antes de transferir.');
    const { pieces, kg } = parseQuantity({ rack, ...payload, actualRackKg: Number(sourceTraceable?.quantity_current || 0) });
    if (!sourceTraceable || Number(sourceTraceable.quantity_current) + 0.001 < kg) throw fail('El saldo trazable del rack no cubre el peso que se quiere transferir. Actualiza o concilia el WIP antes de continuar.');
    const actualKgPerPiece = kg / pieces;
    const materialQuantity = unit.code === 'KG' ? kg : pieces;
    const unitCost = unit.code === 'KG' ? Number(rack.unit_cost_per_kg) : Number(rack.unit_cost_per_kg) * actualKgPerPiece;
    if (!Number.isFinite(unitCost) || unitCost <= 0) throw fail('El rack no tiene un costo transformado positivo y registrado; no se puede capitalizar en Almacén.');

    const lastEntryId = Number(sourceTraceable.metadata?.last_production_entry_id) || null;
    const sourceEntry = lastEntryId ? await db.ExtrusionProductionEntry.findByPk(lastEntryId, { transaction }) : null;
    const transferCode = `EXT-ALM-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const transferQr = await createTransferQr({ userId: user.id, warehouseAreaId: warehouseArea.id, transferCode, transaction });
    const transfer = await db.ExtrusionPtiWarehouseTransfer.create({
      transfer_code: transferCode,
      source_rack_id: rack.id,
      pti_product_id: ptiProduct.id,
      material_id: material.id,
      transfer_qr_code_id: transferQr.id,
      quantity_pieces: pieces,
      quantity_kg: kg,
      material_quantity: round(materialQuantity),
      material_unit_code: unit.code,
      unit_cost: round(unitCost, 4),
      total_cost: round(materialQuantity * unitCost, 4),
      source_area_id: sourceArea.id,
      warehouse_area_id: warehouseArea.id,
      source_production_entry_id: sourceEntry?.id || null,
      source_reference: sourceEntry?.mixture_qr || sourceTraceable.reference_folio || null,
      notes: String(payload.notes || '').trim() || null,
      dispatched_by: user.id,
    }, { transaction });

    sourceTraceable.quantity_current = round(Number(sourceTraceable.quantity_current) - kg);
    sourceTraceable.status = Number(sourceTraceable.quantity_current) <= 0.001 ? 'CONSUMIDO' : 'DISPONIBLE';
    sourceTraceable.updated_by = user.id;
    await sourceTraceable.save({ transaction });
    rack.current_quantity = round(Number(rack.current_quantity) - pieces);
    await rack.save({ transaction });

    const transferTraceable = await db.TraceableItem.create({
      qr_code_id: transferQr.id,
      item_type: 'INTERMEDIATE_PRODUCT',
      material_id: material.id,
      product_name: ptiProduct.name,
      origin_area_id: sourceArea.id,
      current_area_id: warehouseArea.id,
      quantity_initial: kg,
      quantity_current: kg,
      unit: 'KG',
      status: 'TRANSFERIDO',
      reference_folio: transferCode,
      created_by: user.id,
      metadata: {
        destination_route: 'ALMACEN',
        transfer_id: transfer.id,
        source_rack_id: rack.id,
        source_rack_code: rack.rack_code,
        pti_product_id: ptiProduct.id,
        pti_code: ptiProduct.code,
        color: ptiProduct.color || null,
        pieces,
        quantity_kg: kg,
        material_quantity: materialQuantity,
        material_unit_code: unit.code,
        unit_cost: round(unitCost, 4),
        total_cost: round(materialQuantity * unitCost, 4),
        source_reference: sourceEntry?.mixture_qr || sourceTraceable.reference_folio || null,
      },
      notes: 'Transferencia pendiente de recepción física y confirmación en Almacén.',
    }, { transaction });
    await db.TraceabilityLink.create({
      parent_traceable_item_id: sourceTraceable.id,
      child_traceable_item_id: transferTraceable.id,
      parent_qr_code_id: sourceQr.id,
      child_qr_code_id: transferQr.id,
      link_type: 'TRANSFERENCIA_PARCIAL',
      quantity_used: kg,
      quantity_generated: kg,
      scrap_quantity: 0,
      unit: 'KG',
      process_area_id: sourceArea.id,
      notes: `Salida de ${pieces} bobina(s) del rack ${rack.rack_code} a la transferencia ${transferCode}.`,
      metadata: { transfer_id: transfer.id, pti_product_id: ptiProduct.id, material_id: material.id, material_quantity: materialQuantity, material_unit_code: unit.code },
      created_by: user.id,
    }, { transaction });
    await db.TraceabilityMovement.create({
      traceable_item_id: sourceTraceable.id,
      qr_code_id: sourceQr.id,
      movement_type: 'TRANSFERENCIA_AREA',
      from_area_id: sourceArea.id,
      to_area_id: sourceArea.id,
      quantity: kg,
      unit: 'KG',
      balance_after: Number(sourceTraceable.quantity_current),
      reference_folio: transferCode,
      notes: `Se retiraron ${pieces} bobina(s) / ${kg} kg del rack ${rack.rack_code}; nueva custodia en QR ${transferCode}.`,
      metadata: { transfer_id: transfer.id, child_qr_code: transferCode, quantity_pieces: pieces, quantity_kg: kg, remaining_rack_kg: Number(sourceTraceable.quantity_current) },
      performed_by: user.id,
    }, { transaction });
    await db.TraceabilityEvent.create({
      qr_code_id: sourceQr.id,
      entity_type: 'EXTRUSION_PTI_WAREHOUSE_TRANSFER',
      entity_id: String(transfer.id),
      event_type: 'PTI_DISPATCHED_TO_WAREHOUSE',
      from_status: 'DISPONIBLE',
      to_status: Number(sourceTraceable.quantity_current) <= 0.001 ? 'CONSUMIDO' : 'DISPONIBLE',
      from_area_id: sourceArea.id,
      to_area_id: sourceArea.id,
      performed_by: user.id,
      notes: `Salida de ${pieces} bobina(s) / ${kg} kg del rack ${rack.rack_code} para Almacén.`,
      metadata: { transfer_id: transfer.id, transfer_qr_code: transferCode, remaining_pieces: Number(rack.current_quantity), remaining_kg: Number(sourceTraceable.quantity_current) },
    }, { transaction });
    await db.TraceabilityMovement.create({
      traceable_item_id: transferTraceable.id,
      qr_code_id: transferQr.id,
      movement_type: 'TRANSFERENCIA_AREA',
      from_area_id: sourceArea.id,
      to_area_id: warehouseArea.id,
      quantity: kg,
      unit: 'KG',
      balance_after: kg,
      reference_folio: transferCode,
      notes: 'PTI despachado desde rack de Extrusión; a la espera de recepción en Almacén.',
      metadata: { transfer_id: transfer.id, quantity_pieces: pieces, material_quantity: materialQuantity, material_unit_code: unit.code, unit_cost: round(unitCost, 4), total_cost: round(materialQuantity * unitCost, 4) },
      performed_by: user.id,
    }, { transaction });
    await db.TraceabilityEvent.create({
      qr_code_id: transferQr.id,
      entity_type: 'EXTRUSION_PTI_WAREHOUSE_TRANSFER',
      entity_id: String(transfer.id),
      event_type: 'DISPATCH_TO_WAREHOUSE',
      to_status: 'PENDIENTE_RECEPCION',
      from_area_id: sourceArea.id,
      to_area_id: warehouseArea.id,
      performed_by: user.id,
      notes: 'Salida de custodia de Extrusión, pendiente de recepción en Almacén.',
      metadata: { transfer_code: transferCode, source_rack_code: rack.rack_code, pti_code: ptiProduct.code, pieces, quantity_kg: kg },
    }, { transaction });

    return { transfer_id: transfer.id, transfer_code: transferCode, qr_code: transferCode, status: transfer.status, pieces, quantity_kg: kg, material_quantity: materialQuantity, unit: unit.code, unit_cost: round(unitCost, 4), total_cost: round(materialQuantity * unitCost, 4), remaining_rack_pieces: Number(rack.current_quantity), remaining_rack_kg: Number(sourceTraceable.quantity_current) };
  });
};

const registerSaleExit = async (payload, user) => {
  // La salida comercial queda limitada de forma explícita a estos dos roles.
  assertRole(user, ['ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION']);
  return sequelize.transaction(async (transaction) => {
    const rackId = Number(payload.rack_id) || 0;
    const rackQr = String(payload.rack_qr || '').trim();
    if (!rackId && !rackQr) throw fail('Escanea el QR del rack destinado a Venta.', 400);
    const rack = await db.PtiRack.findOne({
      where: rackId ? { id: rackId } : { [Op.or]: [{ qr_code: rackQr }, { rack_code: rackQr }] },
      include: [{ model: db.PtiProduct, as: 'currentPtiProduct' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!rack) throw fail('No se encontró el rack de Extrusión.', 404);
    if (rackQr && ![rack.qr_code, rack.rack_code].some((candidate) => String(candidate || '').trim().toUpperCase() === rackQr.toUpperCase())) {
      throw fail('El QR escaneado no corresponde al rack seleccionado.', 409);
    }
    if (Number(rack.current_quantity) <= 0 || !rack.current_pti_product_id) throw fail('El rack ya está vacío; no hay PTI que registrar como salida.', 409);
    if (rack.destination_route !== 'VENTA') throw fail('Este rack no está destinado a Venta. Su ruta asignada es ' + (rack.destination_route || 'sin ruta') + '.');
    const product = rack.currentPtiProduct;
    if (!Array.isArray(product?.allowed_destinations) || !product.allowed_destinations.includes('VENTA')) {
      throw fail('El Catálogo de PTI no autoriza la salida de este producto a Venta.');
    }
    const sourceArea = await db.Area.findOne({ where: { code: 'EXTRUSION', is_active: true }, transaction });
    const sourceQr = await db.QrCode.findOne({ where: { qr_code: rack.qr_code }, transaction, lock: transaction.LOCK.UPDATE });
    if (!sourceArea || !sourceQr) throw fail('No se encontró el área o QR de origen de Extrusión.');
    const traceable = await db.TraceableItem.findOne({ where: { qr_code_id: sourceQr.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!traceable) throw fail('El QR del rack no tiene un saldo trazable asociado. Concilia el WIP antes de continuar.');
    const pieces = Number(rack.current_quantity);
    const kg = round(Number(traceable.quantity_current || 0));
    if (!Number.isInteger(pieces) || pieces <= 0 || kg <= 0) throw fail('El saldo de piezas o peso del rack no es válido para registrar la salida.');

    const exitCode = `EXT-VTA-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const unitCost = Number(rack.unit_cost_per_kg);
    if (!Number.isFinite(unitCost) || unitCost <= 0) throw fail('El rack no tiene costo transformado por kg; concilia el costo antes de registrar su salida a Venta.');
    const totalCost = round(kg * unitCost, 4);
    const saleExit = await db.ExtrusionPtiSaleExit.create({
      exit_code: exitCode,
      source_rack_id: rack.id,
      pti_product_id: product.id,
      rack_qr_code_id: sourceQr.id,
      quantity_pieces: pieces,
      quantity_kg: kg,
      unit_cost_per_kg: round(unitCost, 6),
      total_cost: totalCost,
      source_area_id: sourceArea.id,
      registered_by: user.id,
      notes: String(payload.notes || '').trim() || null,
    }, { transaction });

    traceable.quantity_current = 0;
    traceable.status = 'CONSUMIDO';
    // The schema requires a current_area_id; retain Extrusión as the last
    // custodian while the zero balance and sale event indicate final exit.
    traceable.current_area_id = sourceArea.id;
    traceable.location = 'SALIDA_VENTA';
    traceable.updated_by = user.id;
    traceable.metadata = {
      ...(traceable.metadata || {}),
      original_destination_route: 'VENTA',
      destination_route: 'VENTA',
      sale_exit: { id: saleExit.id, code: exitCode, registered_by: user.id, registered_at: saleExit.registered_at.toISOString() },
    };
    await traceable.save({ transaction });
    rack.current_quantity = 0;
    await rack.save({ transaction });

    await db.TraceabilityMovement.create({
      traceable_item_id: traceable.id,
      qr_code_id: sourceQr.id,
      movement_type: 'SALIDA_VENTA',
      from_area_id: sourceArea.id,
      to_area_id: null,
      quantity: kg,
      unit: 'KG',
      balance_after: 0,
      reference_folio: exitCode,
      notes: `Salida total de ${pieces} piezas / ${kg} kg del rack ${rack.rack_code} a Venta.`,
      metadata: { sale_exit_id: saleExit.id, pti_product_id: product.id, destination_route: 'VENTA' },
      performed_by: user.id,
    }, { transaction });
    await db.TraceabilityEvent.create({
      qr_code_id: sourceQr.id,
      entity_type: 'EXTRUSION_PTI_SALE_EXIT',
      entity_id: String(saleExit.id),
      event_type: 'PTI_DISPATCHED_TO_SALE',
      from_status: 'DISPONIBLE',
      to_status: 'VENDIDO',
      from_area_id: sourceArea.id,
      to_area_id: null,
      performed_by: user.id,
      notes: `Salida confirmada a Venta. Folio ${exitCode}; ${pieces} piezas / ${kg} kg.`,
      metadata: { sale_exit_id: saleExit.id, exit_code: exitCode, pti_product_id: product.id, pieces, quantity_kg: kg, destination_route: 'VENTA' },
    }, { transaction });
    return { exit_id: saleExit.id, exit_code: exitCode, status: 'VENDIDO', rack_code: rack.rack_code, pti_code: product.code, quantity_pieces: pieces, quantity_kg: kg };
  });
};

const getPendingWarehouseTransfers = async () => {
  const transfers = await db.ExtrusionPtiWarehouseTransfer.findAll({
    where: { status: 'PENDIENTE_RECEPCION' },
    include: [
      { model: db.PtiRack, as: 'sourceRack', attributes: ['rack_code'] },
      { model: db.PtiProduct, as: 'ptiProduct', attributes: ['code', 'name', 'color'] },
      { model: db.Material, as: 'material', attributes: ['id', 'name', 'description', 'default_location_id'] },
      { model: db.QrCode, as: 'qrCode', attributes: ['qr_code'] },
    ],
    order: [['dispatched_at', 'ASC']],
  });
  return transfers;
};

const receiveInWarehouse = async (payload, user) => {
  assertRole(user, ['SUPERADMIN', 'ADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN_ALM', 'ADMIN_ALMACEN', 'WAREHOUSEMAN']);
  const qrCodeValue = String(payload.qr_code || '').trim();
  if (!qrCodeValue) throw fail('Escanea o captura el QR de transferencia.', 400);
  return sequelize.transaction(async (transaction) => {
    const transfer = await db.ExtrusionPtiWarehouseTransfer.findOne({
      where: { transfer_code: qrCodeValue },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!transfer) throw fail('El QR no corresponde a una transferencia PTI pendiente de Extrusión.', 404);
    if (transfer.status !== 'PENDIENTE_RECEPCION') throw fail(`La transferencia ${transfer.transfer_code} ya fue procesada (${transfer.status}).`, 409);
    const locationId = Number(payload.location_id) || null;
    const material = await db.Material.findByPk(transfer.material_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!material) throw fail('El material ligado a esta transferencia ya no existe.');
    const finalLocationId = locationId || Number(material.default_location_id) || null;
    if (!finalLocationId) throw fail('El material no tiene ubicación de Almacén predeterminada. Selecciona la ubicación de recepción.');
    const location = await db.Location.findByPk(finalLocationId, { transaction });
    if (!location || location.is_active === false || (location.area_id && Number(location.area_id) !== Number(transfer.warehouse_area_id))) throw fail('La ubicación elegida no está activa o no pertenece a Almacén.', 400);
    const qr = await db.QrCode.findByPk(transfer.transfer_qr_code_id, { transaction, lock: transaction.LOCK.UPDATE });
    const traceable = await db.TraceableItem.findOne({ where: { qr_code_id: transfer.transfer_qr_code_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!qr || !traceable || qr.purpose !== 'EXTRUSION_PTI_WAREHOUSE_TRANSFER' || qr.status !== 'IN_USE') throw fail('El QR de transferencia no tiene un estado válido para recepción.');
    const duplicateLot = await db.Lote.findOne({ where: { qr_id: qr.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (duplicateLot) throw fail('Este QR ya está ligado a un lote de Almacén; no se puede duplicar la recepción.');
    const { lote, inventory } = await require('./../../warehouse/inventoryDomain.service').receiveLote({
      material_id: transfer.material_id,
      user_id: user.id,
      qr_id: qr.id,
      location_id: finalLocationId,
      quantity: Number(transfer.material_quantity),
      folio: transfer.transfer_code,
      notes: `Recepción PTI Extrusión (${transfer.quantity_pieces} pzas / ${transfer.quantity_kg} kg). QR origen: ${transfer.transfer_code}. ${String(payload.notes || '').trim()}`.trim(),
      unit_cost: Number(transfer.unit_cost),
      total_cost: Number(transfer.total_cost),
    }, transaction);
    const movementInventory = await db.Inventory.findOne({ where: { material_id: transfer.material_id }, transaction, lock: transaction.LOCK.UPDATE });
    await db.InventoryMovement.create({
      inventory_id: movementInventory.id,
      type: 'IN',
      quantity_change: Number(transfer.material_quantity),
      from_location_id: null,
      // inventory_movements.to_location_id still references the legacy
      // operational_areas table; the actual material location is stored on the
      // lote row and in movement notes until that schema is normalized.
      to_location_id: null,
      performed_by: user.id,
      notes: `Recepción de PTI de Extrusión. Transferencia ${transfer.transfer_code}. ${transfer.quantity_pieces} pzas / ${transfer.quantity_kg} kg. Ubicación ${location.code}.`,
      unit_cost: Number(transfer.unit_cost),
      total_cost: Number(transfer.total_cost),
      area_id: transfer.warehouse_area_id,
    }, { transaction });
    transfer.status = 'RECIBIDA';
    transfer.received_lote_id = lote.id;
    transfer.received_by = user.id;
    transfer.received_at = new Date();
    await transfer.save({ transaction });
    traceable.status = 'RECIBIDO';
    traceable.metadata = {
      ...(traceable.metadata || {}),
      original_destination_route: 'ALMACEN',
      destination_route: null,
      warehouse_receipt: { lote_id: lote.id, location_id: finalLocationId, received_by: user.id, received_at: transfer.received_at.toISOString() },
    };
    traceable.location = location.code;
    traceable.updated_by = user.id;
    await traceable.save({ transaction });
    await db.TraceabilityMovement.create({
      traceable_item_id: traceable.id,
      qr_code_id: qr.id,
      movement_type: 'RECEPCION_AREA',
      from_area_id: transfer.source_area_id,
      to_area_id: transfer.warehouse_area_id,
      quantity: Number(transfer.quantity_kg),
      unit: 'KG',
      balance_after: Number(transfer.quantity_kg),
      reference_folio: transfer.transfer_code,
      notes: 'Recepción confirmada en Almacén; lote e inventario capitalizados con el costo congelado de Extrusión.',
      metadata: { transfer_id: transfer.id, lote_id: lote.id, material_quantity: Number(transfer.material_quantity), material_unit_code: transfer.material_unit_code, unit_cost: Number(transfer.unit_cost), total_cost: Number(transfer.total_cost), location_id: finalLocationId },
      performed_by: user.id,
    }, { transaction });
    await db.TraceabilityEvent.create({
      qr_code_id: qr.id,
      entity_type: 'LOTE',
      entity_id: String(lote.id),
      event_type: 'WAREHOUSE_RECEIPT_CONFIRMED',
      from_status: 'PENDIENTE_RECEPCION',
      to_status: 'RECIBIDA',
      from_area_id: transfer.source_area_id,
      to_area_id: transfer.warehouse_area_id,
      performed_by: user.id,
      notes: `Recepción confirmada. Lote ${transfer.transfer_code}; ${transfer.material_quantity} ${transfer.material_unit_code}; costo congelado ${transfer.unit_cost}.`,
      metadata: { transfer_id: transfer.id, lote_id: lote.id, inventory_id: inventory.id, location_id: finalLocationId },
    }, { transaction });
    qr.status = 'ASSIGNED';
    qr.assigned_area_id = transfer.warehouse_area_id;
    await qr.save({ transaction });
    return { transfer_code: transfer.transfer_code, status: transfer.status, lote_id: lote.id, inventory_id: inventory.id, material_quantity: Number(transfer.material_quantity), unit: transfer.material_unit_code, quantity_kg: Number(transfer.quantity_kg), unit_cost: Number(transfer.unit_cost), total_cost: Number(transfer.total_cost), location: location.code };
  });
};

module.exports = { dispatchToWarehouse, registerSaleExit, getPendingWarehouseTransfers, receiveInWarehouse };
