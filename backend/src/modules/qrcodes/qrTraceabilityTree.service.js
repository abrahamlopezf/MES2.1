const { Op } = require('sequelize');
const db = require('../../database/models');

const AREA_CODE_BY_ID = {
  1: 'ALMACEN',
  2: 'EXTRUSION',
  3: 'TELARES',
  4: 'LAMINADO',
  5: 'GLOBO',
  6: 'CORTE',
};

const formatUserFullName = (user) => {
  if (!user) return null;
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return full || user.username || `Usuario #${user.id}`;
};

const normalizeAreaCode = (areaOrName) => {
  if (!areaOrName) return '';
  if (typeof areaOrName === 'object') {
    const code = String(areaOrName.code || '').toUpperCase().trim();
    if (code) return code === 'ALM' ? 'ALMACEN' : code;
    if (areaOrName.id && AREA_CODE_BY_ID[Number(areaOrName.id)]) {
      return AREA_CODE_BY_ID[Number(areaOrName.id)];
    }
    areaOrName = areaOrName.name || '';
  }
  const upper = String(areaOrName)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  if (upper.includes('ALMACEN') || upper === 'ALM') return 'ALMACEN';
  if (upper.includes('EXTRUSION') || upper.includes('MEZCLA')) return 'EXTRUSION';
  if (upper.includes('TELAR') || upper.includes('TEJIDO')) return 'TELARES';
  if (upper.includes('LAMINADO')) return 'LAMINADO';
  if (upper.includes('GLOBO')) return 'GLOBO';
  if (upper.includes('CORTE')) return 'CORTE';
  if (upper.includes('LONAS')) return 'LONAS';
  if (upper.includes('VENTA')) return 'VENTA';
  return upper;
};

/**
 * Determines the operational routing actions by area for a scanned QR entity.
 */
const computeOperationalRouting = ({
  scannedCode,
  qrRecord,
  viajeroRoll,
  ptiRack,
  preparation,
  extruderQueue,
  consumptionOrder,
  wipItem,
  orderItem,
  lote,
  silo,
}) => {
  const encoded = encodeURIComponent(scannedCode);
  const actionsByArea = {};

  // 1. Rollo / Banda / Caja QR Viajero (Telares -> Siguiente Etapa)
  if (viajeroRoll) {
    const rollCode = viajeroRoll.qr_code || viajeroRoll.roll_code || scannedCode;
    const encodedRoll = encodeURIComponent(rollCode);
    const currentStage = normalizeAreaCode(viajeroRoll.current_stage || 'TELARES');
    const nextStage = normalizeAreaCode(viajeroRoll.next_allowed_stage || '');
    const routeStages = Array.isArray(viajeroRoll.route)
      ? viajeroRoll.route.map(normalizeAreaCode)
      : [];
    const allowedBomStages = Array.isArray(viajeroRoll.bom?.allowed_next_stages)
      ? viajeroRoll.bom.allowed_next_stages.map(normalizeAreaCode)
      : [];

    // Telares can always inspect/dispatch/reprint in Viajero Tracker
    actionsByArea.TELARES = {
      route: `/production/viajero-tracker?qr=${encodedRoll}`,
      label: 'Gestionar / Rutar QR Viajero en Telares',
    };

    if (viajeroRoll.status !== 'CONSUMIDO' && viajeroRoll.status !== 'CANCELADO') {
      const candidateTargets = new Set(
        [nextStage, ...routeStages, ...allowedBomStages].filter(
          (stage) => stage && stage !== 'TELARES' && stage !== 'GLOBO'
        )
      );

      if (candidateTargets.has('LAMINADO') || currentStage === 'LAMINADO') {
        actionsByArea.LAMINADO = {
          route: `/production/laminado?qr=${encodedRoll}`,
          label: 'Recibir / Procesar Rollo en Estación de Laminado',
        };
      }
      if (candidateTargets.has('CORTE') || currentStage === 'CORTE') {
        actionsByArea.CORTE = {
          route: `/production/corte?qr=${encodedRoll}`,
          label: 'Recibir / Procesar en Estación de Corte',
        };
      }
      if (candidateTargets.has('ALMACEN') || currentStage === 'ALMACEN') {
        actionsByArea.ALMACEN = {
          route: `/warehouse/inventory?search=${encodedRoll}`,
          label: 'Consultar / Recibir en Almacén',
        };
      }
    }

    return {
      qr_kind: 'VIAJERO_ROLL',
      scanned_code: rollCode,
      entity_title: `${viajeroRoll.output_product_name || viajeroRoll.bom?.name || 'Rollo Viajero'} (${viajeroRoll.roll_code})`,
      current_stage: viajeroRoll.current_stage || 'TELARES',
      current_status: viajeroRoll.status || 'DISPONIBLE',
      actions_by_area: actionsByArea,
    };
  }

  // 2. Rack o Carrito PTI (Extrusión <-> Telares)
  if (ptiRack) {
    const rackQr = ptiRack.qr_code || ptiRack.rack_code || scannedCode;
    const encodedRack = encodeURIComponent(rackQr);

    actionsByArea.EXTRUSION = {
      route: `/production/extrusion?rackQr=${encodedRack}`,
      label: 'Registrar Bobinas PTI en Rack (Terminal de Extrusión)',
    };

    if (Number(ptiRack.current_quantity || 0) > 0) {
      actionsByArea.TELARES = {
        route: `/production/telares?ptiRackQr=${encodedRack}`,
        label: 'Transferir Bobinas del Rack a Fileta de Telar',
      };
    }

    return {
      qr_kind: 'PTI_RACK',
      scanned_code: rackQr,
      entity_title: `${ptiRack.container_type || 'Rack'} PTI ${ptiRack.rack_code}`,
      current_stage: Number(ptiRack.current_quantity || 0) > 0 ? 'WIP Cinta PTI (Extrusión → Telares)' : 'Rack PTI Vacío (Extrusión)',
      current_status: ptiRack.status || 'VACIO',
      actions_by_area: actionsByArea,
    };
  }

  // 3. Preparación de Mezcla / Cola de Extrusión
  if (preparation || extruderQueue) {
    const prepCode =
      qrRecord?.qr_code ||
      extruderQueue?.consumption_order_qr_id ||
      preparation?.folio ||
      scannedCode;
    const encodedPrep = encodeURIComponent(prepCode);
    const status = String(extruderQueue?.status || preparation?.status || 'ACTIVA').toUpperCase();

    if (!['COMPLETADA', 'CANCELADA', 'CONSUMIDA', 'AGOTADA'].includes(status)) {
      actionsByArea.EXTRUSION = {
        route: `/production/extrusion?feedQr=${encodedPrep}`,
        label: 'Operar Mezcla en Terminal de Extrusión',
      };
    }

    return {
      qr_kind: 'PROCESS_PREPARATION',
      scanned_code: prepCode,
      entity_title: `Mezcla / Preparación ${preparation?.folio || prepCode}`,
      current_stage: 'EXTRUSION',
      current_status: status,
      actions_by_area: actionsByArea,
    };
  }

  // 4. Orden de Consumo (ODC: ORD-...)
  if (consumptionOrder) {
    const orderParam = encodeURIComponent(consumptionOrder.uuid || consumptionOrder.id);
    const reqAreaCode = normalizeAreaCode(consumptionOrder.requesting_area);

    actionsByArea.ALMACEN = {
      route: `/warehouse/orders?order_id=${orderParam}`,
      label: 'Surtir / Consultar Orden de Consumo en Almacén',
    };

    if (reqAreaCode) {
      actionsByArea[reqAreaCode] = {
        route: `/warehouse/orders?order_id=${orderParam}&area_id=${consumptionOrder.requesting_area_id || ''}`,
        label: `Ver Orden de Consumo de ${consumptionOrder.requesting_area?.name || reqAreaCode}`,
      };
    }

    return {
      qr_kind: 'CONSUMPTION_ORDER',
      scanned_code: qrRecord?.qr_code || consumptionOrder.order_number || scannedCode,
      entity_title: `Orden de Consumo ${consumptionOrder.order_number}`,
      current_stage: consumptionOrder.requesting_area?.name || 'ALMACEN',
      current_status: consumptionOrder.status || 'PENDIENTE',
      actions_by_area: actionsByArea,
    };
  }

  // 5. Sub-lote WIP surtido por ODC (SUB-...)
  if (wipItem || orderItem) {
    const areaObj = wipItem?.area || orderItem?.order?.requesting_area;
    const areaCode = normalizeAreaCode(areaObj);
    const available = Number(wipItem?.amount ?? orderItem?.delivered_amount ?? 0);

    if (available > 0 && areaCode) {
      const routeByArea = {
        EXTRUSION: `/production/mixing?qr=${encoded}`,
        TELARES: `/telares/dashboard?qr=${encoded}`,
        LAMINADO: `/laminado/wip?qr=${encoded}`,
        GLOBO: `/globo/wip?qr=${encoded}`,
      };
      if (routeByArea[areaCode]) {
        actionsByArea[areaCode] = {
          route: routeByArea[areaCode],
          label: `Utilizar Insumo WIP en ${areaObj?.name || areaCode}`,
        };
      }
    }

    return {
      qr_kind: 'WIP_SUBLOT',
      scanned_code: qrRecord?.qr_code || scannedCode,
      entity_title: `Insumo Surtido (WIP) ${wipItem?.material?.name || orderItem?.material?.name || ''}`.trim(),
      current_stage: areaObj?.name || areaCode || 'PLANTA',
      current_status: available > 0 ? 'DISPONIBLE EN ÁREA' : 'CONSUMIDO',
      actions_by_area: actionsByArea,
    };
  }

  // 6. Silo de Polipropileno
  if (silo) {
    actionsByArea.ALMACEN = {
      route: `/warehouse/silos`,
      label: 'Gestionar Silo en Almacén',
    };
    actionsByArea.EXTRUSION = {
      route: `/production/mixing?qr=${encodeURIComponent(silo.code)}`,
      label: 'Usar Silo en Centro de Mezclado (Extrusión)',
    };

    return {
      qr_kind: 'SILO',
      scanned_code: silo.code,
      entity_title: `Silo ${silo.code} - ${silo.name}`,
      current_stage: 'ALMACEN / EXTRUSION',
      current_status: Number(silo.current_stock_kg || 0) > 0 ? 'ACTIVO CON SALDO' : 'VACÍO',
      actions_by_area: actionsByArea,
    };
  }

  // 7. Lote de Materia Prima en Almacén
  if (lote) {
    const available = Number(lote.available_amount || 0);
    if (lote.is_active && available > 0) {
      actionsByArea.ALMACEN = {
        route: `/warehouse/lotes/${lote.id}`,
        label: 'Gestionar Lote de Materia Prima en Almacén',
      };
    }

    return {
      qr_kind: 'WAREHOUSE_LOT',
      scanned_code: qrRecord?.qr_code || lote.folio || scannedCode,
      entity_title: `Lote de Almacén ${lote.folio} (${lote.material?.name || 'Materia Prima'})`,
      current_stage: 'ALMACEN',
      current_status: !lote.is_active ? 'BAJA / INACTIVO' : available > 0 ? 'DISPONIBLE EN ALMACÉN' : 'CONSUMIDO',
      actions_by_area: actionsByArea,
    };
  }

  // 8. QR Virgen / Disponible sin entidad asociada
  if (qrRecord) {
    const status = String(qrRecord.status || '').toUpperCase();
    const assignedAreaCode = normalizeAreaCode(qrRecord.assignedArea);
    const isVirgin = ['GENERATED', 'AVAILABLE', 'UNASSIGNED', 'ASSIGNED', 'GENERADO', 'DISPONIBLE'].includes(status);

    if (isVirgin) {
      if (!assignedAreaCode || assignedAreaCode === 'ALMACEN') {
        actionsByArea.ALMACEN = {
          route: `/warehouse/receive?qr=${encodeURIComponent(qrRecord.qr_code)}`,
          label: 'Registrar Ingreso de Materia Prima en Almacén',
          requires_admin_alm: true,
        };
      }
      if (assignedAreaCode === 'EXTRUSION') {
        actionsByArea.EXTRUSION = {
          route: `/production/mixing?qr=${encodeURIComponent(qrRecord.qr_code)}`,
          label: 'Vincular QR en Centro de Mezclado (Extrusión)',
        };
      }
    }

    return {
      qr_kind: isVirgin ? 'VIRGIN_QR' : 'GENERIC_QR',
      scanned_code: qrRecord.qr_code,
      entity_title: `Código QR ${qrRecord.qr_code}`,
      current_stage: qrRecord.assignedArea?.name || 'ALMACEN',
      current_status: status || 'UNASSIGNED',
      actions_by_area: actionsByArea,
    };
  }

  return null;
};

/**
 * Resolves any scanned QR across the plant and builds its full end-to-end Traceability Tree
 * from Warehouse Reception (Ingreso en Almacén) up to its current location/stage.
 */
const buildFullQrLookup = async (rawInput, { qrInclude, eventInclude, buildQrResponse, buildEventResponse }) => {
  const cleanCode = String(rawInput || '').trim();
  const upperCode = cleanCode.toUpperCase();

  // ---------------------------------------------------------------------------
  // STEP 1: Locate direct matches across all plant tables
  // ---------------------------------------------------------------------------
  const whereClause = {
    [Op.or]: [
      { qr_code: { [Op.iLike]: cleanCode } },
      { qr_code: { [Op.iLike]: `%-${cleanCode}` } },
    ],
  };

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode)) {
    whereClause[Op.or].push({ uuid: cleanCode });
  } else if (!Number.isNaN(Number(cleanCode)) && cleanCode !== '') {
    const padded = String(cleanCode).padStart(9, '0');
    whereClause[Op.or].push({ qr_code: { [Op.like]: `%-${padded}` } });
  }

  let qrRecord = await db.QrCode.findOne({
    where: whereClause,
    include: qrInclude,
  });

  if (!qrRecord && !Number.isNaN(Number(cleanCode)) && cleanCode !== '' && Number.isInteger(Number(cleanCode))) {
    qrRecord = await db.QrCode.findByPk(parseInt(cleanCode, 10), {
      include: qrInclude,
    });
  }

  // Check ViajeroRoll
  let viajeroRoll = await db.ViajeroRoll.findOne({
    where: {
      [Op.or]: [
        { qr_code: { [Op.iLike]: cleanCode } },
        { roll_code: { [Op.iLike]: cleanCode } },
      ],
    },
    include: [
      { model: db.Loom, as: 'loom', include: [{ model: db.Subarea, as: 'subarea' }] },
      { model: db.ProductionBom, as: 'bom' },
      { model: db.LoomRun, as: 'run', include: [{ model: db.User, as: 'operator' }] },
      { model: db.User, as: 'operator' },
      { model: db.User, as: 'shiftSupervisor' },
      {
        model: db.ViajeroRollOperatorSegment,
        as: 'operatorSegments',
        include: [{ model: db.User, as: 'operator' }],
      },
      {
        model: db.ViajeroRoutingLog,
        as: 'routingLogs',
        include: [
          { model: db.Area, as: 'area' },
          { model: db.User, as: 'operator' },
        ],
      },
      {
        model: db.LoomBackflushConsumption,
        as: 'consumptions',
        include: [
          { model: db.PtiRack, as: 'rack' },
          { model: db.PtiProduct, as: 'ptiProduct' },
          { model: db.LoomPtiWip, as: 'sourceWipItem' },
        ],
      },
    ],
  });

  // Check PtiRack
  let ptiRack = await db.PtiRack.findOne({
    where: {
      [Op.or]: [
        { qr_code: { [Op.iLike]: cleanCode } },
        { rack_code: { [Op.iLike]: cleanCode } },
      ],
    },
    include: [
      { model: db.PtiProduct, as: 'currentPtiProduct' },
      { model: db.Material, as: 'currentPtiType' },
      { model: db.Subarea, as: 'destinationSubarea' },
    ],
  });

  // Check ProcessPreparation & ExtruderQueue
  const prepOrConditions = [{ folio: { [Op.iLike]: cleanCode } }];
  if (qrRecord?.id) {
    prepOrConditions.push({ destination_qr_code_id: qrRecord.id });
  }
  let preparation = await db.ProcessPreparation.findOne({
    where: { [Op.or]: prepOrConditions },
    include: [
      { model: db.ProcessFormula, as: 'formula' },
      {
        model: db.ProcessPreparationInput,
        as: 'inputs',
        include: [
          { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
          {
            model: db.Lote,
            as: 'sourceLot',
            include: [
              { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
              { model: db.Supplier, as: 'supplier' },
              { model: db.Location, as: 'location' },
              { model: db.User, as: 'user' },
              { model: db.QrCode, as: 'qr_code' },
            ],
          },
          {
            model: db.Silo,
            as: 'sourceSilo',
            include: [{ model: db.Material, as: 'material' }],
          },
          { model: db.QrCode, as: 'sourceQrCode' },
        ],
      },
    ],
    order: [['id', 'DESC']],
  });

  let extruderQueue = await db.ExtruderQueue.findOne({
    where: {
      [Op.or]: [
        { consumption_order_qr_id: { [Op.iLike]: cleanCode } },
        ...(qrRecord?.qr_code ? [{ consumption_order_qr_id: { [Op.iLike]: qrRecord.qr_code } }] : []),
        ...(preparation?.id ? [{ process_preparation_id: preparation.id }] : []),
      ],
    },
    include: [
      { model: db.Extruder, as: 'extruder' },
      { model: db.Formula, as: 'formula' },
    ],
    order: [['id', 'DESC']],
  });

  if (!preparation && extruderQueue?.process_preparation_id) {
    preparation = await db.ProcessPreparation.findByPk(extruderQueue.process_preparation_id, {
      include: [
        { model: db.ProcessFormula, as: 'formula' },
        {
          model: db.ProcessPreparationInput,
          as: 'inputs',
          include: [
            { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
            {
              model: db.Lote,
              as: 'sourceLot',
              include: [
                { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
                { model: db.Supplier, as: 'supplier' },
                { model: db.Location, as: 'location' },
                { model: db.User, as: 'user' },
                { model: db.QrCode, as: 'qr_code' },
              ],
            },
            {
              model: db.Silo,
              as: 'sourceSilo',
              include: [{ model: db.Material, as: 'material' }],
            },
            { model: db.QrCode, as: 'sourceQrCode' },
          ],
        },
      ],
    });
  }

  // Check ConsumptionOrder (ORD-...)
  const orderOrConditions = [{ order_number: { [Op.iLike]: cleanCode } }];
  if (upperCode.startsWith('ORD-')) {
    const rawOrderRef = cleanCode.slice(4);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawOrderRef)) {
      orderOrConditions.push({ uuid: rawOrderRef });
    }
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode)) {
    orderOrConditions.push({ uuid: cleanCode });
  }
  if (qrRecord?.id) {
    orderOrConditions.push({ qr_code_id: qrRecord.id });
  }

  let consumptionOrder = await db.ConsumptionOrder.findOne({
    where: { [Op.or]: orderOrConditions },
    include: [
      { model: db.Area, as: 'requesting_area' },
      { model: db.User, as: 'requester' },
      { model: db.User, as: 'resolver' },
      { model: db.QrCode, as: 'qr_code' },
      {
        model: db.ConsumptionOrderItem,
        as: 'items',
        include: [
          { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
          {
            model: db.Lote,
            as: 'lote',
            include: [
              { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
              { model: db.Supplier, as: 'supplier' },
              { model: db.Location, as: 'location' },
              { model: db.User, as: 'user' },
              { model: db.QrCode, as: 'qr_code' },
            ],
          },
          { model: db.QrCode, as: 'child_qr' },
        ],
      },
    ],
  });

  // Check WipInventory & ConsumptionOrderItem (Sub-lote QR)
  let wipItem = null;
  let orderItem = null;
  if (qrRecord?.id) {
    wipItem = await db.WipInventory.findOne({
      where: { qr_code_id: qrRecord.id },
      include: [
        { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
        { model: db.Area, as: 'area' },
        { model: db.QrCode, as: 'qr_code' },
        {
          model: db.Lote,
          as: 'lote',
          include: [
            { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
            { model: db.Supplier, as: 'supplier' },
            { model: db.Location, as: 'location' },
            { model: db.User, as: 'user' },
            { model: db.QrCode, as: 'qr_code' },
          ],
        },
      ],
    });

    orderItem = await db.ConsumptionOrderItem.findOne({
      where: { child_qr_id: qrRecord.id },
      include: [
        { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
        { model: db.QrCode, as: 'child_qr' },
        {
          model: db.ConsumptionOrder,
          as: 'order',
          include: [
            { model: db.Area, as: 'requesting_area' },
            { model: db.User, as: 'requester' },
            { model: db.User, as: 'resolver' },
            { model: db.QrCode, as: 'qr_code' },
          ],
        },
        {
          model: db.Lote,
          as: 'lote',
          include: [
            { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
            { model: db.Supplier, as: 'supplier' },
            { model: db.Location, as: 'location' },
            { model: db.User, as: 'user' },
            { model: db.QrCode, as: 'qr_code' },
          ],
        },
      ],
    });
  }

  // Check Lote (Almacén)
  const loteOrConditions = [{ folio: { [Op.iLike]: cleanCode } }];
  if (qrRecord?.id) {
    loteOrConditions.push({ qr_id: qrRecord.id });
  }
  let directLote = await db.Lote.findOne({
    where: { [Op.or]: loteOrConditions },
    include: [
      { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
      { model: db.Supplier, as: 'supplier' },
      { model: db.Location, as: 'location' },
      { model: db.User, as: 'user' },
      { model: db.QrCode, as: 'qr_code' },
    ],
    order: [['created_at', 'DESC']],
  });

  // Check Silo
  let directSilo = await db.Silo.findOne({
    where: {
      [Op.or]: [
        { code: { [Op.iLike]: cleanCode } },
        { name: { [Op.iLike]: cleanCode } },
      ],
    },
    include: [{ model: db.Material, as: 'material' }],
  });

  if (
    !qrRecord &&
    !viajeroRoll &&
    !ptiRack &&
    !preparation &&
    !extruderQueue &&
    !consumptionOrder &&
    !wipItem &&
    !orderItem &&
    !directLote &&
    !directSilo
  ) {
    const err = new Error('Código QR no encontrado.');
    err.statusCode = 404;
    err.status = 404;
    throw err;
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Upstream & Downstream Lineage Resolution (Almacén -> Ubicación actual)
  // ---------------------------------------------------------------------------
  const collectedRacks = new Map();
  const collectedProdEntries = new Map();
  const collectedPreps = new Map();
  const collectedOrders = new Map();
  const collectedWipSublots = new Map();
  const collectedLots = new Map();
  const collectedSilos = new Map();
  const collectedLoomWips = new Map();
  const collectedLoomRuns = new Map();
  const collectedRolls = new Map();

  if (viajeroRoll) {
    collectedRolls.set(viajeroRoll.id, viajeroRoll);
    if (viajeroRoll.run) {
      collectedLoomRuns.set(viajeroRoll.run.id, viajeroRoll.run);
    }
    for (const cons of viajeroRoll.consumptions || []) {
      if (cons.rack) collectedRacks.set(cons.rack.id, cons.rack);
      if (cons.sourceWipItem) collectedLoomWips.set(cons.sourceWipItem.id, cons.sourceWipItem);
    }
    if (viajeroRoll.loom_id) {
      const loomWips = await db.LoomPtiWip.findAll({
        where: { loom_id: viajeroRoll.loom_id },
        include: [
          { model: db.Loom, as: 'loom' },
          { model: db.PtiProduct, as: 'ptiProduct' },
          { model: db.PtiRack, as: 'sourceRack' },
        ],
        order: [['received_at', 'DESC']],
        limit: 10,
      });
      for (const lw of loomWips) {
        collectedLoomWips.set(lw.id, lw);
        if (lw.sourceRack) collectedRacks.set(lw.sourceRack.id, lw.sourceRack);
      }
    }
  }

  if (ptiRack) {
    collectedRacks.set(ptiRack.id, ptiRack);
    const rackWips = await db.LoomPtiWip.findAll({
      where: { source_rack_id: ptiRack.id },
      include: [
        { model: db.Loom, as: 'loom' },
        { model: db.PtiProduct, as: 'ptiProduct' },
        { model: db.PtiRack, as: 'sourceRack' },
      ],
      order: [['received_at', 'DESC']],
      limit: 10,
    });
    for (const lw of rackWips) {
      collectedLoomWips.set(lw.id, lw);
    }
  }

  // From collected Racks & LoomPtiWip -> fetch ExtrusionProductionEntries
  const rackIds = [...collectedRacks.keys()];
  const sourceEntryIds = [...collectedLoomWips.values()]
    .map((lw) => lw.source_production_entry_id)
    .filter(Boolean);

  if (rackIds.length > 0 || sourceEntryIds.length > 0) {
    const entryOr = [];
    if (rackIds.length > 0) entryOr.push({ rack_id: { [Op.in]: rackIds } });
    if (sourceEntryIds.length > 0) entryOr.push({ id: { [Op.in]: sourceEntryIds } });

    const entries = await db.ExtrusionProductionEntry.findAll({
      where: {
        [Op.or]: entryOr,
        voided_at: null,
      },
      include: [
        { model: db.Extruder, as: 'extruder' },
        { model: db.PtiRack, as: 'rack' },
        { model: db.PtiProduct, as: 'ptiProduct' },
        { model: db.Subarea, as: 'destinationSubarea' },
      ],
      order: [['recorded_at', 'DESC']],
      limit: 15,
    });
    for (const entry of entries) {
      collectedProdEntries.set(entry.id, entry);
    }
  }

  // From ExtrusionProductionEntries -> fetch ProcessPreparations
  if (preparation) {
    collectedPreps.set(preparation.id, preparation);
  }
  const prepIdsFromEntries = [...collectedProdEntries.values()]
    .map((e) => e.process_preparation_id)
    .filter((id) => id && !collectedPreps.has(id));

  if (prepIdsFromEntries.length > 0) {
    const preps = await db.ProcessPreparation.findAll({
      where: { id: { [Op.in]: prepIdsFromEntries } },
      include: [
        { model: db.ProcessFormula, as: 'formula' },
        {
          model: db.ProcessPreparationInput,
          as: 'inputs',
          include: [
            { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
            {
              model: db.Lote,
              as: 'sourceLot',
              include: [
                { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
                { model: db.Supplier, as: 'supplier' },
                { model: db.Location, as: 'location' },
                { model: db.User, as: 'user' },
                { model: db.QrCode, as: 'qr_code' },
              ],
            },
            {
              model: db.Silo,
              as: 'sourceSilo',
              include: [{ model: db.Material, as: 'material' }],
            },
            { model: db.QrCode, as: 'sourceQrCode' },
          ],
        },
      ],
    });
    for (const p of preps) {
      collectedPreps.set(p.id, p);
    }
  }

  // If a ProcessPreparation was scanned directly, also check its downstream ExtrusionProductionEntries
  if (preparation && collectedProdEntries.size === 0) {
    const entriesForPrep = await db.ExtrusionProductionEntry.findAll({
      where: { process_preparation_id: preparation.id, voided_at: null },
      include: [
        { model: db.Extruder, as: 'extruder' },
        { model: db.PtiRack, as: 'rack' },
        { model: db.PtiProduct, as: 'ptiProduct' },
        { model: db.Subarea, as: 'destinationSubarea' },
      ],
      order: [['recorded_at', 'DESC']],
      limit: 15,
    });
    for (const entry of entriesForPrep) {
      collectedProdEntries.set(entry.id, entry);
      if (entry.rack) collectedRacks.set(entry.rack.id, entry.rack);
    }
  }

  // From ProcessPreparationInputs -> collect upstream Lotes, Silos, and Sub-lote QRs
  const sourceQrIdsFromPreps = new Set();
  for (const prep of collectedPreps.values()) {
    for (const inp of prep.inputs || []) {
      if (inp.sourceLot) {
        collectedLots.set(inp.sourceLot.id, inp.sourceLot);
      }
      if (inp.sourceSilo) {
        collectedSilos.set(inp.sourceSilo.id, inp.sourceSilo);
      }
      if (inp.source_qr_code_id) {
        sourceQrIdsFromPreps.add(inp.source_qr_code_id);
      }
    }
  }

  if (directLote) collectedLots.set(directLote.id, directLote);
  if (directSilo) collectedSilos.set(directSilo.id, directSilo);
  if (consumptionOrder) {
    collectedOrders.set(consumptionOrder.id, consumptionOrder);
    for (const item of consumptionOrder.items || []) {
      if (item.lote) collectedLots.set(item.lote.id, item.lote);
    }
  }
  if (wipItem) {
    collectedWipSublots.set(`wip-${wipItem.id}`, wipItem);
    if (wipItem.lote) collectedLots.set(wipItem.lote.id, wipItem.lote);
  }
  if (orderItem) {
    if (orderItem.order) collectedOrders.set(orderItem.order.id, orderItem.order);
    if (orderItem.lote) collectedLots.set(orderItem.lote.id, orderItem.lote);
  }

  // Fetch ConsumptionOrderItems / Orders linked to upstream Lotes or sourceQrIdsFromPreps
  const lotIds = [...collectedLots.keys()];
  const subQrIds = [...sourceQrIdsFromPreps];
  if (lotIds.length > 0 || subQrIds.length > 0) {
    const itemOr = [];
    if (lotIds.length > 0) itemOr.push({ lote_id: { [Op.in]: lotIds } });
    if (subQrIds.length > 0) itemOr.push({ child_qr_id: { [Op.in]: subQrIds } });

    const relatedOrderItems = await db.ConsumptionOrderItem.findAll({
      where: { [Op.or]: itemOr },
      include: [
        { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
        { model: db.QrCode, as: 'child_qr' },
        {
          model: db.ConsumptionOrder,
          as: 'order',
          include: [
            { model: db.Area, as: 'requesting_area' },
            { model: db.User, as: 'requester' },
            { model: db.User, as: 'resolver' },
            { model: db.QrCode, as: 'qr_code' },
          ],
        },
        {
          model: db.Lote,
          as: 'lote',
          include: [
            { model: db.Material, as: 'material', include: [{ model: db.MaterialUnit, as: 'unit' }] },
            { model: db.Supplier, as: 'supplier' },
            { model: db.Location, as: 'location' },
            { model: db.User, as: 'user' },
            { model: db.QrCode, as: 'qr_code' },
          ],
        },
      ],
      limit: 20,
    });

    for (const oi of relatedOrderItems) {
      if (oi.order) {
        const existingOrder = collectedOrders.get(oi.order.id);
        if (!existingOrder) {
          const plainOrder = oi.order.get ? oi.order.get({ plain: true }) : oi.order;
          plainOrder.items = [oi];
          collectedOrders.set(oi.order.id, plainOrder);
        } else if (Array.isArray(existingOrder.items) && !existingOrder.items.some((x) => x.id === oi.id)) {
          existingOrder.items.push(oi);
        }
      }
      if (oi.lote) {
        collectedLots.set(oi.lote.id, oi.lote);
      }
    }
  }

  // Fetch recent Silo entry movements for collected Silos
  const siloMovementsBySiloId = new Map();
  if (collectedSilos.size > 0) {
    const siloMovs = await db.InventoryMovement.findAll({
      where: {
        silo_id: { [Op.in]: [...collectedSilos.keys()] },
      },
      order: [['created_at', 'DESC']],
      limit: 15,
    });
    for (const mov of siloMovs) {
      const list = siloMovementsBySiloId.get(mov.silo_id) || [];
      list.push(mov);
      siloMovementsBySiloId.set(mov.silo_id, list);
    }
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Build Ordered End-to-End Traceability Tree (Ingreso Almacén -> Actual)
  // ---------------------------------------------------------------------------
  const traceabilityTree = [];

  // Stage 1: Ingreso en Almacén (Lotes de Materia Prima y Silos PP)
  if (collectedLots.size > 0 || collectedSilos.size > 0) {
    const warehouseItems = [];

    for (const l of collectedLots.values()) {
      const unitAbbr = l.material?.unit?.abbreviation || 'kg';
      warehouseItems.push({
        type: 'LOTE_ALMACEN',
        title: `Lote ${l.folio} — ${l.material?.material_code || ''} ${l.material?.name || 'Materia Prima'}`.trim(),
        qr_code: l.qr_code?.qr_code || l.folio,
        status: !l.is_active ? 'BAJA / INACTIVO' : Number(l.available_amount) > 0 ? 'ACTIVO EN ALMACÉN' : 'CONSUMIDO',
        timestamp: l.date_received || l.created_at,
        details: [
          { label: 'Folio de Lote / Factura', value: l.folio },
          { label: 'Código QR Almacén', value: l.qr_code?.qr_code || 'N/D' },
          { label: 'Material', value: `${l.material?.material_code || ''} - ${l.material?.name || 'N/D'}` },
          { label: 'Proveedor', value: l.supplier?.name || 'No especificado' },
          { label: 'Fecha de Recepción', value: l.date_received ? new Date(l.date_received).toLocaleString() : 'N/D' },
          { label: 'Fecha de Factura', value: l.invoice_date || 'N/D' },
          { label: 'Cantidad Ingresada', value: `${Number(l.initial_amount || 0).toFixed(2)} ${unitAbbr}` },
          { label: 'Saldo Actual en Almacén', value: `${Number(l.available_amount || 0).toFixed(2)} ${unitAbbr}` },
          {
            label: 'Ubicación en Almacén',
            value: l.location ? `${l.location.name}${l.location.zone ? ` (${l.location.zone})` : ''}` : 'General',
          },
          { label: 'Recibido por', value: formatUserFullName(l.user) || 'Almacén' },
        ],
      });
    }

    for (const s of collectedSilos.values()) {
      const movs = siloMovementsBySiloId.get(s.id) || [];
      const latestEntry = movs.find((m) => ['ENTRY', 'INGRESO_SILO_PP'].includes(String(m.movement_type || '').toUpperCase())) || movs[0];
      warehouseItems.push({
        type: 'SILO_ALMACEN',
        title: `Silo ${s.code} (${s.name}) — ${s.material?.name || 'Polipropileno'}`,
        qr_code: s.code,
        status: Number(s.current_stock_kg || 0) > 0 ? 'CON SALDO' : 'VACÍO',
        timestamp: latestEntry?.created_at || s.updated_at || s.created_at,
        details: [
          { label: 'Código de Silo', value: `${s.code} - ${s.name}` },
          { label: 'Material Asignado', value: s.material ? `${s.material.material_code} - ${s.material.name}` : 'Polipropileno' },
          { label: 'Lote Activo en Silo', value: s.current_lot_number || latestEntry?.lot_number || 'N/D' },
          { label: 'Stock Actual / Capacidad', value: `${Number(s.current_stock_kg || 0).toFixed(2)} kg / ${Number(s.capacity_kg || 0).toFixed(0)} kg` },
          ...(latestEntry
            ? [
                { label: 'Último Movimiento Registrado', value: `${latestEntry.movement_type} (${Number(latestEntry.quantity || 0).toFixed(2)} kg)` },
                { label: 'Notas / Factura de Ingreso', value: latestEntry.notes || 'Sin observaciones' },
              ]
            : []),
        ],
      });
    }

    traceabilityTree.push({
      stage_key: 'ALMACEN_INGRESO',
      step_number: traceabilityTree.length + 1,
      title: 'Ingreso y Recepción en Almacén',
      area_name: 'Almacén de Materia Prima',
      status: 'COMPLETADO',
      timestamp: warehouseItems[0]?.timestamp || null,
      items: warehouseItems,
    });
  }

  // Stage 2: Orden de Consumo (ODC) y Surtido de Sub-lotes WIP
  if (collectedOrders.size > 0 || collectedWipSublots.size > 0) {
    const odcItems = [];

    for (const ord of collectedOrders.values()) {
      const itemsSummary = (ord.items || []).map((it) => {
        const u = it.material?.unit?.abbreviation || 'kg';
        return `${it.material?.name || 'Material'}: Solicitado ${Number(it.requested_amount || 0).toFixed(2)} ${u} / Entregado ${Number(it.delivered_amount || 0).toFixed(2)} ${u} (Lote: ${it.lote?.folio || 'N/D'}${it.child_qr?.qr_code ? ` → QR Hijo: ${it.child_qr.qr_code}` : ''})`;
      });

      odcItems.push({
        type: 'ORDEN_CONSUMO',
        title: `Orden de Consumo ${ord.order_number} → ${ord.requesting_area?.name || 'Planta'}`,
        qr_code: ord.qr_code?.qr_code || `ORD-${ord.uuid}`,
        status: ord.status,
        timestamp: ord.resolved_at || ord.created_at,
        details: [
          { label: 'Folio ODC', value: ord.order_number },
          { label: 'Código QR ODC', value: ord.qr_code?.qr_code || `ORD-${ord.uuid}` },
          { label: 'Área Solicitante', value: ord.requesting_area?.name || 'Planta' },
          { label: 'Estado de la Orden', value: ord.status },
          { label: 'Solicitado por', value: formatUserFullName(ord.requester) || 'N/D' },
          { label: 'Surtido / Autorizado por', value: formatUserFullName(ord.resolver) || 'Pendiente' },
          { label: 'Fecha de Solicitud', value: ord.created_at ? new Date(ord.created_at).toLocaleString() : 'N/D' },
          { label: 'Fecha de Surtido', value: ord.resolved_at ? new Date(ord.resolved_at).toLocaleString() : 'Pendiente' },
          ...itemsSummary.map((line, idx) => ({
            label: `Insumo Surtido #${idx + 1}`,
            value: line,
          })),
        ],
      });
    }

    for (const wip of collectedWipSublots.values()) {
      const u = wip.material?.unit?.abbreviation || 'kg';
      odcItems.push({
        type: 'SUBLOTE_WIP',
        title: `Sub-lote WIP en ${wip.area?.name || 'Planta'} — ${wip.material?.name || 'Insumo'}`,
        qr_code: wip.qr_code?.qr_code || cleanCode,
        status: Number(wip.amount || 0) > 0 ? 'DISPONIBLE EN WIP' : 'CONSUMIDO EN PROCESO',
        timestamp: wip.created_at,
        details: [
          { label: 'QR Sub-lote WIP', value: wip.qr_code?.qr_code || cleanCode },
          { label: 'Área Custodia', value: wip.area?.name || 'Planta' },
          { label: 'Material', value: `${wip.material?.material_code || ''} - ${wip.material?.name || ''}` },
          { label: 'Lote Origen Almacén', value: wip.lote?.folio || 'N/D' },
          { label: 'Saldo Disponible en Área', value: `${Number(wip.amount || 0).toFixed(2)} ${u}` },
        ],
      });
    }

    traceabilityTree.push({
      stage_key: 'ORDEN_CONSUMO_SURTIDO',
      step_number: traceabilityTree.length + 1,
      title: 'Surtido de Almacén a Planta (ODC / WIP)',
      area_name: 'Almacén → Producción',
      status: 'COMPLETADO',
      timestamp: odcItems[0]?.timestamp || null,
      items: odcItems,
    });
  }

  // Stage 3: Preparación de Mezcla y Cola de Extrusión
  if (collectedPreps.size > 0 || extruderQueue) {
    const mixItems = [];

    for (const prep of collectedPreps.values()) {
      const inputLines = (prep.inputs || []).map((inp) => {
        const originLabel = inp.sourceLot
          ? `Lote Almacén: ${inp.sourceLot.folio}`
          : inp.sourceSilo
          ? `Silo: ${inp.sourceSilo.code} (Lote PP: ${inp.source_lot_number || inp.sourceSilo.current_lot_number || 'N/D'})`
          : inp.source_lot_number
          ? `Lote: ${inp.source_lot_number}`
          : 'Origen directo';
        return `${inp.material?.name || 'Ingrediente'}: ${Number(inp.quantity || 0).toFixed(2)} ${inp.unit || 'kg'} (${originLabel})`;
      });

      mixItems.push({
        type: 'PREPARACION_MEZCLA',
        title: `Preparación de Mezcla ${prep.folio} — Fórmula: ${prep.formula?.name || 'Estándar'}`,
        qr_code: prep.folio,
        status: prep.status,
        timestamp: prep.prepared_at || prep.created_at,
        details: [
          { label: 'Folio de Mezcla', value: prep.folio },
          { label: 'Fórmula Aplicada', value: prep.formula ? `${prep.formula.code || ''} ${prep.formula.name}`.trim() : 'N/D' },
          { label: 'Cantidad Total Preparada', value: `${Number(prep.total_quantity || 0).toFixed(2)} ${prep.unit || 'kg'}` },
          { label: 'Saldo Restante de Mezcla', value: `${Number(prep.remaining_quantity_kg ?? prep.total_quantity ?? 0).toFixed(2)} ${prep.unit || 'kg'}` },
          { label: 'Estado de la Mezcla', value: prep.status },
          { label: 'Fecha de Preparación', value: prep.prepared_at ? new Date(prep.prepared_at).toLocaleString() : 'N/D' },
          ...inputLines.map((line, idx) => ({
            label: `Componente Mezclado #${idx + 1}`,
            value: line,
          })),
        ],
      });
    }

    if (extruderQueue) {
      mixItems.push({
        type: 'COLA_EXTRUSION',
        title: `Cola en ${extruderQueue.extruder?.name || `Extrusora #${extruderQueue.extruder_id}`}`,
        qr_code: extruderQueue.consumption_order_qr_id,
        status: extruderQueue.status,
        timestamp: extruderQueue.created_at,
        details: [
          { label: 'Máquina Extrusora', value: extruderQueue.extruder?.name || `Extrusora #${extruderQueue.extruder_id}` },
          { label: 'QR de Alimentación / Tina', value: extruderQueue.consumption_order_qr_id },
          { label: 'Fórmula en Cola', value: extruderQueue.formula?.name || 'N/D' },
          { label: 'Estado en Cola', value: extruderQueue.status },
          { label: 'Prioridad', value: String(extruderQueue.priority || 1) },
        ],
      });
    }

    traceabilityTree.push({
      stage_key: 'MEZCLADO_PREPARACION',
      step_number: traceabilityTree.length + 1,
      title: 'Centro de Mezclado y Alimentación a Extrusión',
      area_name: 'Mezclado / Extrusión',
      status: extruderQueue?.status || 'EN PROCESO',
      timestamp: mixItems[0]?.timestamp || null,
      items: mixItems,
    });
  }

  // Stage 4: Extrusión de Cinta PTI y Carga en Racks / Carritos PTI
  if (collectedRacks.size > 0 || collectedProdEntries.size > 0) {
    const extItems = [];

    for (const r of collectedRacks.values()) {
      extItems.push({
        type: 'RACK_PTI',
        title: `${r.container_type || 'Rack'} PTI ${r.rack_code} (${r.currentPtiProduct?.name || r.currentPtiType?.name || 'Cinta PTI'})`,
        qr_code: r.qr_code || r.rack_code,
        status: r.status,
        timestamp: r.updated_at || r.created_at,
        details: [
          { label: 'Código de Rack / Carrito', value: `${r.rack_code} (${r.container_type || 'RACK'})` },
          { label: 'Código QR Físico', value: r.qr_code },
          {
            label: 'Cinta PTI Actual',
            value: r.currentPtiProduct
              ? `${r.currentPtiProduct.pti_code} - ${r.currentPtiProduct.name} (Denier ${r.currentPtiProduct.denier || 'N/D'}, Ancho ${r.currentPtiProduct.tape_width_mm || 'N/D'} mm, Color ${r.currentPtiProduct.color || 'N/D'})`
              : r.currentPtiType?.name || 'Sin producto asignado (Vacío)',
          },
          { label: 'Bobinas Disponibles en Rack', value: `${Number(r.current_quantity || 0)} / ${Number(r.max_capacity || 100)} bobinas` },
          { label: 'Peso Unitario por Bobina', value: r.unit_weight_kg ? `${Number(r.unit_weight_kg).toFixed(3)} kg` : 'N/D' },
          { label: 'Peso Neto Estimado en Rack', value: `${Number(r.net_weight_kg || 0).toFixed(2)} kg` },
          { label: 'Subárea Destino', value: r.destinationSubarea?.name || r.destination_route || 'Telares' },
          { label: 'Ubicación Actual', value: r.location_name || 'Área de Racks PTI' },
        ],
      });
    }

    for (const entry of collectedProdEntries.values()) {
      extItems.push({
        type: 'PRODUCCION_EXTRUSION',
        title: `Salida de ${entry.extruder?.name || `Extrusora #${entry.extruder_id}`} → Rack ${entry.rack?.rack_code || entry.rack_id}`,
        qr_code: entry.rack?.qr_code || entry.mixture_qr,
        status: 'REGISTRADO',
        timestamp: entry.recorded_at || entry.created_at,
        details: [
          { label: 'Máquina Extrusora', value: entry.extruder?.name || `Extrusora #${entry.extruder_id}` },
          { label: 'Producto PTI Extruido', value: entry.ptiProduct ? `${entry.ptiProduct.pti_code} - ${entry.ptiProduct.name}` : 'Cinta PTI' },
          { label: 'Color Registrado', value: entry.pti_color_snapshot || entry.ptiProduct?.color || 'N/D' },
          { label: 'Bobinas Ingresadas al Rack', value: `${entry.pieces} bobinas` },
          { label: 'Peso Neto Registrado', value: `${Number(entry.net_weight_kg || 0).toFixed(2)} kg (${entry.weight_source || 'BÁSCULA'})` },
          { label: 'Mezcla Consumida', value: `${Number(entry.mixture_consumed_kg || 0).toFixed(2)} kg (QR Mezcla: ${entry.mixture_qr})` },
          { label: 'Fecha y Hora de Registro', value: entry.recorded_at ? new Date(entry.recorded_at).toLocaleString() : 'N/D' },
        ],
      });
    }

    traceabilityTree.push({
      stage_key: 'EXTRUSION_RACK_PTI',
      step_number: traceabilityTree.length + 1,
      title: 'Extrusión de Cinta PTI y Carga en Racks / Carritos',
      area_name: 'Extrusión',
      status: 'COMPLETADO',
      timestamp: extItems[0]?.timestamp || null,
      items: extItems,
    });
  }

  // Stage 5: Abastecimiento a Fileta (WIP Telares) y Corrida de Tejido
  if (collectedLoomWips.size > 0 || collectedLoomRuns.size > 0) {
    const loomStageItems = [];

    for (const lw of collectedLoomWips.values()) {
      loomStageItems.push({
        type: 'FILETA_WIP_TELAR',
        title: `Carga en Fileta de ${lw.loom?.name || `Telar #${lw.loom_id}`} (${lw.ptiProduct?.name || 'Cinta PTI'})`,
        qr_code: lw.source_qr_code || lw.sourceRack?.qr_code || 'WIP-FILETA',
        status: Number(lw.quantity_remaining_spools || 0) > 0 ? 'EN FILETA (ACTIVO)' : 'AGOTADO EN CORRIDA',
        timestamp: lw.received_at || lw.created_at,
        details: [
          { label: 'Telar Destino', value: lw.loom ? `${lw.loom.loom_code} - ${lw.loom.name}` : `Telar #${lw.loom_id}` },
          { label: 'Rack PTI Origen', value: lw.sourceRack?.rack_code || lw.source_qr_code || 'N/D' },
          { label: 'Cinta PTI Cargada', value: lw.ptiProduct ? `${lw.ptiProduct.pti_code} - ${lw.ptiProduct.name}` : 'Cinta PTI' },
          { label: 'Especificación de Cinta', value: `Denier ${lw.denier_snapshot || 'N/D'} · Ancho ${lw.tape_width_mm_snapshot || 'N/D'} mm · Color ${lw.color_snapshot || 'N/D'}` },
          { label: 'Bobinas Recibidas en Fileta', value: `${Number(lw.quantity_received_spools || 0).toFixed(0)} bobinas` },
          { label: 'Bobinas Restantes en Fileta', value: `${Number(lw.quantity_remaining_spools || 0).toFixed(1)} bobinas` },
          { label: 'Fecha de Carga a Fileta', value: lw.received_at ? new Date(lw.received_at).toLocaleString() : 'N/D' },
        ],
      });
    }

    for (const run of collectedLoomRuns.values()) {
      loomStageItems.push({
        type: 'CORRIDA_TELAR',
        title: `Corrida de Tejido ${run.folio}`,
        qr_code: run.folio,
        status: run.status,
        timestamp: run.started_at || run.created_at,
        details: [
          { label: 'Folio de Corrida', value: run.folio },
          { label: 'Turno de Inicio', value: run.shift },
          { label: 'Estado de Corrida', value: run.status },
          { label: 'Metros Planeados / Producidos', value: `${Number(run.meters_planned || 0).toFixed(1)} m / ${Number(run.meters_produced || 0).toFixed(1)} m` },
          { label: 'Peso Total Producido', value: `${Number(run.total_weight_produced_kg || 0).toFixed(2)} kg` },
          { label: 'Operador de Inicio', value: formatUserFullName(run.operator) || 'N/D' },
          { label: 'Inicio de Corrida', value: run.started_at ? new Date(run.started_at).toLocaleString() : 'N/D' },
          { label: 'Fin de Corrida', value: run.finished_at ? new Date(run.finished_at).toLocaleString() : 'En curso' },
        ],
      });
    }

    traceabilityTree.push({
      stage_key: 'TELARES_FILETA_CORRIDA',
      step_number: traceabilityTree.length + 1,
      title: 'Abastecimiento a Fileta y Proceso de Tejido en Telares',
      area_name: 'Telares / Tejeduría',
      status: 'COMPLETADO',
      timestamp: loomStageItems[0]?.timestamp || null,
      items: loomStageItems,
    });
  }

  // Stage 6: Salida de Rollo / Banda / Caja QR Viajero y Ruteo
  if (collectedRolls.size > 0) {
    const rollItems = [];

    for (const roll of collectedRolls.values()) {
      const segments = (roll.operatorSegments || []).map((seg, i) => {
        const opName = formatUserFullName(seg.operator) || `Operador #${seg.operator_id}`;
        const nomina = seg.operator?.numero_nomina || roll.operator_nomina || 'S/N';
        const weightPart =
          seg.weight_start_kg != null && seg.weight_end_kg != null
            ? ` · Peso: ${Number(seg.weight_start_kg).toFixed(2)} kg → ${Number(seg.weight_end_kg).toFixed(2)} kg`
            : '';
        return `Tramo #${i + 1} (Turno ${seg.shift_number}): ${opName} [Nómina ${nomina}] — ${Number(seg.meters_start).toFixed(1)} m → ${Number(seg.meters_end).toFixed(1)} m${weightPart}`;
      });

      const backflushLines = (roll.consumptions || []).map((c) => {
        return `${c.role}: ${c.ptiProduct?.name || 'Cinta PTI'} (Rack ${c.rack?.rack_code || c.rack_id}) — ${Number(c.spools_consumed || 0).toFixed(2)} bobinas / ${Number(c.theoretical_kg || 0).toFixed(2)} kg`;
      });

      const routingLines = (roll.routingLogs || []).map((rl) => {
        const opName = formatUserFullName(rl.operator) || 'Operador';
        return `${rl.action} (${rl.from_stage} → ${rl.to_stage}) por ${opName} el ${rl.created_at ? new Date(rl.created_at).toLocaleString() : 'N/D'}${rl.notes ? ` — ${rl.notes}` : ''}`;
      });

      rollItems.push({
        type: 'VIAJERO_ROLL',
        title: `${roll.output_product_name || roll.bom?.name || 'Salida de Telares'} — Código Rollo: ${roll.roll_code}`,
        qr_code: roll.qr_code,
        status: `${roll.status} (Etapa actual: ${roll.current_stage})`,
        timestamp: roll.created_at,
        details: [
          { label: 'Código de Rollo (Nomenclatura)', value: roll.roll_code },
          { label: 'Código QR Viajero', value: roll.qr_code },
          { label: 'Tipo de Producto', value: roll.product_kind || 'ROLLO_TELA' },
          { label: 'Especificación / BOM', value: roll.bom ? `${roll.bom.code} - ${roll.bom.name}` : roll.output_product_name || 'N/D' },
          { label: 'Telar de Origen', value: roll.loom ? `${roll.loom.loom_code} - ${roll.loom.name} (Telar #${roll.loom_number || roll.loom.loom_number || roll.loom.id})` : `Telar #${roll.loom_number || roll.loom_id}` },
          { label: 'Turno / Consecutivo de Rollo', value: `Turno ${roll.shift_number || 1} · Rollo #${roll.roll_sequence || 1}` },
          { label: 'Nómina Operador Principal', value: roll.operator_nomina || roll.operator?.numero_nomina || 'N/D' },
          { label: 'Metraje Total Producido', value: `${Number(roll.meters || 0).toFixed(2)} m` },
          { label: 'Peso Total en Báscula', value: `${Number(roll.weight_kg || 0).toFixed(2)} kg` },
          { label: 'Ancho / Gramaje', value: `${Number(roll.width_cm || 0).toFixed(1)} cm · ${Number(roll.grammage_g_per_m || 0).toFixed(2)} g/m` },
          { label: 'Ubicación / Etapa Actual', value: roll.current_stage || 'TELARES' },
          { label: 'Siguiente Etapa Permitida', value: roll.next_allowed_stage || (Array.isArray(roll.bom?.allowed_next_stages) ? roll.bom.allowed_next_stages.join(', ') : 'CORTE') },
          ...backflushLines.map((line, idx) => ({
            label: `Consumo PTI Backflush #${idx + 1}`,
            value: line,
          })),
          ...segments.map((line, idx) => ({
            label: `Participación Operador #${idx + 1}`,
            value: line,
          })),
          ...routingLines.map((line, idx) => ({
            label: `Movimiento de Ruteo #${idx + 1}`,
            value: line,
          })),
        ],
      });
    }

    traceabilityTree.push({
      stage_key: 'VIAJERO_ROLLO_RUTEO',
      step_number: traceabilityTree.length + 1,
      title: 'Generación de QR Viajero y Ruteo a Siguiente Área',
      area_name: 'Telares → Ruteo de Planta',
      status: viajeroRoll?.status || 'DISPONIBLE',
      timestamp: rollItems[0]?.timestamp || null,
      items: rollItems,
    });
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Events, Legacy Inventory Payload & Operational Routing Summary
  // ---------------------------------------------------------------------------
  let events = [];
  if (qrRecord?.id) {
    const rawEvents = await db.TraceabilityEvent.findAll({
      where: { qr_code_id: qrRecord.id },
      include: eventInclude,
      order: [['created_at', 'ASC']],
    });
    events = rawEvents.map(buildEventResponse);
  }

  // If no stages were populated yet (e.g. a virgin QR with only generation/assignment events), add a stage for QR creation
  if (traceabilityTree.length === 0 && qrRecord) {
    traceabilityTree.push({
      stage_key: 'QR_IDENTIDAD',
      step_number: 1,
      title: 'Generación y Asignación de Etiqueta QR',
      area_name: qrRecord.assignedArea?.name || 'Centro de Identidad QR',
      status: qrRecord.status,
      timestamp: qrRecord.created_at || qrRecord.createdAt || null,
      items: [
        {
          type: 'QR_VIRGEN',
          title: `Etiqueta QR ${qrRecord.qr_code}`,
          qr_code: qrRecord.qr_code,
          status: qrRecord.status,
          timestamp: qrRecord.created_at || qrRecord.createdAt,
          details: [
            { label: 'Código QR', value: qrRecord.qr_code },
            { label: 'Lote de Impresión', value: qrRecord.batch?.batch_code || 'Individual' },
            { label: 'Área Asignada', value: qrRecord.assignedArea?.name || 'Almacén / General' },
            { label: 'Estado Actual', value: qrRecord.status },
            { label: 'Creado por', value: formatUserFullName(qrRecord.creator) || 'Sistema' },
          ],
        },
      ],
    });
  }

  const operationalRouting = computeOperationalRouting({
    scannedCode: cleanCode,
    qrRecord,
    viajeroRoll,
    ptiRack,
    preparation,
    extruderQueue,
    consumptionOrder,
    wipItem,
    orderItem,
    lote: directLote,
    silo: directSilo,
  });

  const primaryLote = directLote || [...collectedLots.values()][0] || null;
  const inventory = primaryLote
    ? {
        lote_id: primaryLote.id,
        folio: primaryLote.folio,
        qr_code_value: primaryLote.qr_code?.qr_code || qrRecord?.qr_code || cleanCode,
        material: primaryLote.material
          ? primaryLote.material.get
            ? primaryLote.material.get({ plain: true })
            : primaryLote.material
          : null,
        quantity: primaryLote.available_amount,
        initial_amount: primaryLote.initial_amount,
        supplier: primaryLote.supplier
          ? primaryLote.supplier.get
            ? primaryLote.supplier.get({ plain: true })
            : primaryLote.supplier
          : null,
        location_detail: primaryLote.location
          ? primaryLote.location.get
            ? primaryLote.location.get({ plain: true })
            : primaryLote.location
          : null,
        is_active: primaryLote.is_active,
      }
    : null;

  const synthesizedQr = qrRecord
    ? buildQrResponse(qrRecord)
    : {
        id: viajeroRoll?.id || ptiRack?.id || preparation?.id || consumptionOrder?.id || directLote?.id || directSilo?.id || 0,
        qr_code: operationalRouting?.scanned_code || cleanCode,
        batch_id: null,
        batch: null,
        assigned_area: {
          id: null,
          name: operationalRouting?.current_stage || 'Planta',
          code: normalizeAreaCode(operationalRouting?.current_stage || ''),
        },
        status: operationalRouting?.current_status || 'ACTIVO',
        is_active: true,
        created_by: null,
      };

  return {
    qr: synthesizedQr,
    events,
    inventory,
    operational_routing: operationalRouting,
    traceability_tree: traceabilityTree,
  };
};

module.exports = {
  buildFullQrLookup,
  computeOperationalRouting,
  normalizeAreaCode,
};

