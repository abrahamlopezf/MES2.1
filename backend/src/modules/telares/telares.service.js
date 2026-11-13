const { Op } = require('sequelize');
const { createHash } = require('node:crypto');
const bcrypt = require('bcrypt');
const { getCdmxDateString, getCdmxShift, nowCdmx } = require('../../utils/timezone');
const { isSupervisor, canViewCosts, getUserAreaCode } = require('../../shared/security/accessRules');
const normalizeViajeroQr = require('../../shared/utils/normalizeViajeroQr');
const {
  normalizeStageName,
  normalizeProductionRoute,
  validateOperatorMeterCoverage,
  validateOutputMeasures,
  validateOperatorWeightCoverage,
  estimateBomFabricWeightKg,
  getTelaresPtiCatalogQr,
} = require('./productionRules');
const {
  sequelize,
  Loom,
  ProductionBom,
  ProductionBomItem,
  LoomRun,
  TelaresScrapLog,
  ViajeroRoll,
  ViajeroRollOperatorSegment,
  ViajeroRoutingLog,
  LoomBackflushConsumption,
  PtiRack,
  PtiProduct,
  Formula,
  Material,
  User,
  Role,
  Area,
  Subarea,
  WipInventory,
  LoomPtiWip,
  SystemSetting,
  QrCode,
  TraceableItem,
  TraceabilityMovement,
  TraceabilityEvent,
  AuditLog,
  Notification,
  ExtrusionProductionEntry,
  ProcessPreparation,
  ProcessPreparationInput,
  Lote,
  Silo,
  Extruder,
} = require('../../database/models');

const DIRECT_EXTRUSION_PTI_ROUTES = new Set(['CORTE_BANDA', 'CORTE_CINTA', 'ALMACEN', 'VENTA']);
const isDirectExtrusionPtiRoute = (rack) => {
  const route = String(rack?.destination_route || '').trim().toUpperCase();
  return Boolean(route) && DIRECT_EXTRUSION_PTI_ROUTES.has(route);
};
const getExpectedPtiTelaresRoute = (ptiProduct) => {
  const configured = String(ptiProduct?.telares_subarea_code || '').toUpperCase();
  if (configured === 'TELARES_BANDA' || configured === 'TELARES_ROLLO') return configured;
  if (configured === 'NO_APLICA') return null;
  const legacyMachineNumber = Number(ptiProduct?.extrusion_machine_number);
  if (legacyMachineNumber === 1) return 'TELARES_BANDA';
  if ([2, 4, 5].includes(legacyMachineNumber)) return 'TELARES_ROLLO';
  return null;
};
const assertRackAuthorizedForTelares = (rack, ptiProduct) => {
  const expectedRoute = getExpectedPtiTelaresRoute(ptiProduct);
  if (!expectedRoute) throw Object.assign(new Error(`El PTI ${ptiProduct?.code || ''} no está configurado para abastecer Telares.`), { statusCode: 409, code: 'PTI_NOT_ASSIGNED_TO_TELARES' });
  if (rack?.destination_route && rack.destination_route !== expectedRoute) {
    throw Object.assign(
      new Error(`El rack ${rack.rack_code} está reservado para ${rack.destination_route}; no puede consumirse en ${expectedRoute}.`),
      { statusCode: 409, code: 'PTI_TELARES_ROUTE_MISMATCH' },
    );
  }
};
const isRackAuthorizedForTelares = (rack) => {
  const ptiProduct = rack?.currentPtiProduct;
  if (!ptiProduct || isDirectExtrusionPtiRoute(rack)) return false;
  const expectedRoute = getExpectedPtiTelaresRoute(ptiProduct);
  return Boolean(expectedRoute) && (!rack.destination_route || rack.destination_route === expectedRoute);
};

class TelaresService {
  normalizeStageName(stage) {
    return normalizeStageName(stage);
  }

  normalizeProductionRoute(route, productKind = 'ROLLO_TELA') {
    return normalizeProductionRoute(route, productKind);
  }

  calculateBomPtiDemand(bom, plannedMeters, plannedWeightKg = null) {
    const meters = Number(plannedMeters);
    if (!Number.isFinite(meters) || meters <= 0) throw Object.assign(new Error('Los metros objetivo deben ser mayores a cero.'), { statusCode: 400 });
    if (bom?.is_provisional) {
      throw Object.assign(
        new Error(`La ficha ${bom.code} es provisional. No se puede iniciar ni cerrar producción hasta confirmar el consumo de PTI con Planta.`),
        { statusCode: 409, code: 'BOM_PROVISIONAL_NOT_PRODUCTION_READY' },
      );
    }
    if (!Array.isArray(bom.items) || !bom.items.length || bom.items.some((item) => !Number(item.pti_product_id))) {
      throw Object.assign(new Error(`La ficha ${bom.code} necesita al menos un PTI de Extrusión vinculado.`), { statusCode: 409, code: 'BOM_PTI_REQUIRED' });
    }
    const standardMeters = Number(bom.standard_output_meters || 0);
    const expectedOutputs = Number(bom.expected_output_quantity || 1);
    const outputUnit = String(bom.expected_output_unit || 'ROLLO').toUpperCase();
    const outputMultiplier = standardMeters > 0 ? (meters / standardMeters) * expectedOutputs : null;

    return (bom.items || []).map((item) => {
      const requiredQuantity = Number(item.required_quantity || 0);
      const unit = String(item.required_unit || 'KG').toUpperCase();
      const perMeter = Number(item.consumption_per_meter || 0);
      const perMeterUnit = String(item.consumption_per_meter_unit || 'KG').toUpperCase();
      let requiredKg = null;
      let requiredSpools = null;
      if (perMeter > 0) {
        if (perMeterUnit === 'KG') requiredKg = perMeter * meters;
        else if (perMeterUnit === 'PIEZAS') requiredSpools = perMeter * meters;
      } else if (requiredQuantity > 0 && outputUnit === 'KG') {
        const reportedWeightKg = Number(plannedWeightKg || 0);
        const estimatedWeightKg = reportedWeightKg > 0
          ? reportedWeightKg
          : (!bom.is_provisional ? (estimateBomFabricWeightKg(bom, meters) || 0) : 0);
        if (estimatedWeightKg <= 0 || expectedOutputs <= 0) {
          throw Object.assign(new Error(`La ficha ${bom.code} requiere un peso base de salida para calcular el consumo por kg.`), { statusCode: 409, code: 'BOM_OUTPUT_BASIS_REQUIRED' });
        }
        const multiplier = estimatedWeightKg / expectedOutputs;
        if (unit === 'KG') requiredKg = requiredQuantity * multiplier;
        else if (unit === 'PIEZAS') requiredSpools = requiredQuantity * multiplier;
      } else if (requiredQuantity > 0 && outputUnit === 'METRO') {
        const multiplier = meters / expectedOutputs;
        if (unit === 'KG') requiredKg = requiredQuantity * multiplier;
        else if (unit === 'PIEZAS') requiredSpools = requiredQuantity * multiplier;
      } else if (requiredQuantity > 0 && outputMultiplier) {
        if (unit === 'KG') requiredKg = requiredQuantity * outputMultiplier;
        else if (unit === 'PIEZAS') requiredSpools = requiredQuantity * outputMultiplier;
      } else {
        const gramsPerMeter = Number(item.consumption_g_per_m || 0);
        const consumptionGramsPerMeter = gramsPerMeter;
        if (consumptionGramsPerMeter <= 0) {
          throw Object.assign(new Error(`La ficha ${bom.code} no tiene consumo configurado para ${item.ptiProduct?.code || `PTI ${item.pti_product_id}`}.`), { statusCode: 409, code: 'BOM_PTI_CONSUMPTION_REQUIRED' });
        }
        requiredKg = (consumptionGramsPerMeter * meters) / 1000;
      }
      return { item, requiredKg, requiredSpools, outputMultiplier };
    });
  }

  async assessLoomPtiAvailability({ loomId, bom, plannedMeters, plannedWeightKg = null, transaction }) {
    const demands = this.calculateBomPtiDemand(bom, plannedMeters, plannedWeightKg);
    const productIds = demands.map(({ item }) => Number(item.pti_product_id)).filter(Boolean);
    const [wipRows, racks] = await Promise.all([
      LoomPtiWip.findAll({
        where: { loom_id: loomId, pti_product_id: { [Op.in]: productIds }, quantity_remaining_spools: { [Op.gt]: 0 } },
        order: [['received_at', 'ASC'], ['id', 'ASC']],
        transaction,
        ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
      }),
      PtiRack.findAll({
        where: {
          current_pti_product_id: { [Op.in]: productIds },
          current_quantity: { [Op.gt]: 0 },
          [Op.or]: [{ destination_route: null }, { destination_route: { [Op.in]: ['TELARES_ROLLO', 'TELARES_BANDA'] } }],
        },
        attributes: ['id', 'rack_code', 'qr_code', 'current_pti_product_id', 'current_quantity', 'unit_weight_kg', 'container_type', 'created_at', 'destination_route'],
        include: [{ model: PtiProduct, as: 'currentPtiProduct', attributes: ['id', 'code', 'name', 'color', 'denier', 'extrusion_machine_number', 'extrusion_machine_id', 'telares_subarea_code'], required: false }],
        order: [['created_at', 'ASC'], ['id', 'ASC']],
        transaction,
        // The PTI is an optional LEFT JOIN; lock only rows from the rack table.
        ...(transaction ? { lock: { level: transaction.LOCK.UPDATE, of: PtiRack } } : {}),
      }),
    ]);
    const mode = await this.getPtiTransferMode(transaction);
    const groupedDemands = new Map();
    for (const demand of demands) {
      const productId = Number(demand.item.pti_product_id);
      const group = groupedDemands.get(productId) || { item: demand.item, roles: new Set(), requiredKg: 0, requiredSpools: 0, hasKg: false, hasSpools: false };
      group.roles.add(String(demand.item.role || 'URDIMBRE').toUpperCase());
      if (demand.requiredKg != null) { group.requiredKg += Number(demand.requiredKg); group.hasKg = true; }
      if (demand.requiredSpools != null) { group.requiredSpools += Number(demand.requiredSpools); group.hasSpools = true; }
      groupedDemands.set(productId, group);
    }
    const shortages = [...groupedDemands.entries()].map(([productId, group]) => {
      const { item } = group;
      const productWip = wipRows.filter((row) => Number(row.pti_product_id) === productId);
      const productRacks = racks.filter((rack) => Number(rack.current_pti_product_id) === productId && isRackAuthorizedForTelares(rack));
      const wipSpools = productWip.reduce((sum, row) => sum + Number(row.quantity_remaining_spools || 0), 0);
      const wipKg = productWip.reduce((sum, row) => sum + Number(row.quantity_remaining_spools || 0) * Number(row.unit_weight_kg || 0), 0);
      const knownWipRows = productWip.filter((row) => Number(row.unit_weight_kg || 0) > 0);
      const knownRackRows = productRacks.filter((rack) => Number(rack.unit_weight_kg || 0) > 0);
      const knownSpools = knownWipRows.reduce((sum, row) => sum + Number(row.quantity_remaining_spools || 0), 0)
        + knownRackRows.reduce((sum, rack) => sum + Number(rack.current_quantity || 0), 0);
      const knownWeightKg = knownWipRows.reduce((sum, row) => sum + Number(row.quantity_remaining_spools || 0) * Number(row.unit_weight_kg || 0), 0)
        + knownRackRows.reduce((sum, rack) => sum + Number(rack.current_quantity || 0) * Number(rack.unit_weight_kg || 0), 0);
      const averageSpoolKg = knownSpools > 0 ? knownWeightKg / knownSpools : null;
      const normalizedRequiredKg = group.hasKg || (group.hasSpools && averageSpoolKg)
        ? Number(group.requiredKg + (averageSpoolKg ? group.requiredSpools * averageSpoolKg : 0))
        : null;
      const normalizedRequiredSpools = group.hasSpools || (group.hasKg && averageSpoolKg)
        ? Number(group.requiredSpools + (averageSpoolKg ? group.requiredKg / averageSpoolKg : 0))
        : null;
      const deficitKg = normalizedRequiredKg == null ? null : Math.max(0, normalizedRequiredKg - wipKg);
      const deficitSpools = deficitKg != null && averageSpoolKg ? deficitKg / averageSpoolKg : (normalizedRequiredSpools == null ? null : Math.max(0, normalizedRequiredSpools - wipSpools));
      const fifoRacks = [];
      let suggestedKg = 0;
      let suggestedSpools = 0;
      for (const rack of productRacks) {
        const kgStillNeeded = deficitKg != null && suggestedKg < deficitKg;
        const spoolsStillNeeded = deficitSpools != null && suggestedSpools < deficitSpools;
        if (!kgStillNeeded && !spoolsStillNeeded) break;
        const rackKg = Number(rack.current_quantity) * Number(rack.unit_weight_kg || 0);
        fifoRacks.push({ qr_code: rack.qr_code, rack_code: rack.rack_code, color: item.ptiProduct?.color || rack.currentPtiProduct?.color || null, spools: Number(rack.current_quantity), weight_kg: rack.unit_weight_kg ? Number(rackKg.toFixed(3)) : null });
        suggestedKg += rackKg;
        suggestedSpools += Number(rack.current_quantity || 0);
        const kgCovered = deficitKg == null || suggestedKg >= deficitKg;
        const spoolsCovered = deficitSpools == null || suggestedSpools >= deficitSpools;
        if (mode === 'RACK_PARTIAL' && kgCovered && spoolsCovered) break;
      }
      return {
        pti_product_id: productId,
        code: item.ptiProduct?.code || `PTI-${productId}`,
        name: item.ptiProduct?.name || null,
        color: item.ptiProduct?.color || null,
        role: [...group.roles].join(', '),
        roles: [...group.roles],
        required_kg: normalizedRequiredKg == null ? null : Number(normalizedRequiredKg.toFixed(3)),
        required_spools: normalizedRequiredSpools == null ? null : Number(normalizedRequiredSpools.toFixed(2)),
        wip_kg: Number(wipKg.toFixed(3)),
        wip_spools: Number(wipSpools.toFixed(2)),
        deficit_kg: deficitKg == null ? null : Number(deficitKg.toFixed(3)),
        deficit_spools: deficitSpools == null ? null : Number(deficitSpools.toFixed(2)),
        fifo_racks: fifoRacks,
        estimated_full_containers: mode === 'CART_FULL' && ((deficitKg != null && deficitKg > 0) || (deficitSpools != null && deficitSpools > 0)) ? fifoRacks.length : null,
        mode,
      };
    });
    return { sufficient: shortages.every((row) => row.deficit_kg === 0 || (row.deficit_kg == null && row.deficit_spools === 0)), shortages };
  }

  async notifyTelaresSupervisors({ loom, bom, plannedMeters, shortages }, senderId = null) {
    const supervisors = await User.findAll({
      where: { is_active: true },
      include: [{ model: Role, as: 'role', where: { code: 'SUPERVISOR_TELARES' }, required: true }],
      attributes: ['id'],
    });
    if (!supervisors.length) return 0;
    const detail = shortages.map((item) => {
      const sources = item.fifo_racks.length
        ? item.fifo_racks.map((rack) => `${rack.qr_code} (${rack.spools} bobinas${rack.weight_kg == null ? '' : ` / ${rack.weight_kg} kg`})`).join(', ')
        : 'sin rack con saldo disponible';
      return `${item.code} · ${item.color || 'color sin dato'}: faltan ${item.deficit_kg == null ? 'peso unitario por confirmar' : `${item.deficit_kg} kg`}${item.deficit_spools == null ? '' : ` / ${item.deficit_spools} bobinas`}. FIFO: ${sources}${item.mode === 'CART_FULL' ? ` · carritos completos estimados: ${item.estimated_full_containers ?? 'no calculable'}` : ''}.`;
    }).join('\n');
    const message = `El telar ${loom.name} no tiene WIP suficiente para iniciar ${bom.name} (${plannedMeters} m). Reabastecer antes de iniciar:\n${detail}`;
    await Notification.bulkCreate(supervisors.map(({ id }) => ({
      recipient_id: id,
      sender_id: senderId || null,
      type: 'TELARES_PTI_SHORTAGE',
      title: `PTI requerido · ${loom.name}`,
      message,
      is_read: false,
    })));
    return supervisors.length;
  }

  async getPtiTransferMode(transaction = null) {
    const setting = await SystemSetting.findByPk('telares.pti_transfer_mode', {
      ...(transaction ? { transaction } : {}),
      ...(transaction?.LOCK ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    return setting?.value === 'CART_FULL' ? 'CART_FULL' : 'RACK_PARTIAL';
  }

  async getPtiRackByCode(code) {
    const clean = String(code || '').trim();
    if (!clean) return null;
    return PtiRack.findOne({
      where: { [Op.or]: [{ qr_code: clean }, { rack_code: clean }] },
      attributes: ['id', 'rack_code', 'qr_code', 'current_quantity', 'current_pti_type_id', 'current_pti_product_id', 'destination_subarea_id', 'destination_route', 'status', 'container_type', 'unit_weight_kg', 'created_at'],
      include: [{
        model: PtiProduct,
        as: 'currentPtiProduct',
        attributes: ['id', 'code', 'name', 'color', 'denier', 'tape_width_mm', 'extrusion_machine_number', 'extrusion_machine_id', 'telares_subarea_code'],
        required: false,
      }],
    });
  }

  async getAvailablePtiRacks() {
    return PtiRack.findAll({
      where: {
        current_quantity: { [Op.gt]: 0 },
        custody_shift_session_id: null,
        [Op.or]: [{ destination_route: null }, { destination_route: { [Op.in]: ['TELARES_ROLLO', 'TELARES_BANDA'] } }],
      },
      attributes: ['id', 'rack_code', 'qr_code', 'current_quantity', 'current_pti_type_id', 'current_pti_product_id', 'destination_subarea_id', 'destination_route', 'status', 'container_type', 'unit_weight_kg', 'created_at'],
      include: [{
        model: PtiProduct,
        as: 'currentPtiProduct',
        attributes: ['id', 'code', 'name', 'color', 'denier', 'tape_width_mm', 'extrusion_machine_number', 'extrusion_machine_id', 'telares_subarea_code'],
        required: false,
      }],
      order: [['created_at', 'ASC'], ['id', 'ASC']],
    }).then((racks) => racks.filter(isRackAuthorizedForTelares));
  }

  async setPtiTransferMode(mode, userId = null) {
    const normalizedMode = String(mode || '').trim().toUpperCase();
    if (!['RACK_PARTIAL', 'CART_FULL'].includes(normalizedMode)) {
      const error = new Error('El modo debe ser RACK_PARTIAL o CART_FULL.');
      error.statusCode = 400;
      throw error;
    }
    const transaction = await sequelize.transaction();
    try {
      let setting = await SystemSetting.findByPk('telares.pti_transfer_mode', { transaction, lock: transaction.LOCK.UPDATE });
      const previousMode = setting?.value || 'RACK_PARTIAL';
      if (!setting) {
        setting = await SystemSetting.create({ key: 'telares.pti_transfer_mode', value: normalizedMode, updated_by: userId }, { transaction });
      } else {
        await setting.update({ value: normalizedMode, updated_by: userId }, { transaction });
      }
      if (previousMode !== normalizedMode) {
        await AuditLog.create({
          user_id: userId || null,
          action: 'UPDATE',
          entity_type: 'SYSTEM_SETTING',
          entity_id: 'telares.pti_transfer_mode',
          module: 'TELARES',
          description: `Cambio del modo de transferencia de PTI de ${previousMode} a ${normalizedMode}.`,
          before_data: { transfer_mode: previousMode },
          after_data: { transfer_mode: normalizedMode },
          metadata: { setting_key: 'telares.pti_transfer_mode' },
        }, { transaction });
      }
      await transaction.commit();
      return { transfer_mode: normalizedMode };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async debitRackTraceability(rack, quantityKg, transaction, referenceFolio, userId, notes, movementType = 'CONSUMO_PROCESO', movementContext = {}) {
    const qr = await QrCode.findOne({ where: { qr_code: rack.qr_code }, transaction, lock: transaction.LOCK.UPDATE });
    const traceable = qr && await TraceableItem.findOne({ where: { qr_code_id: qr.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!traceable) return null; // Legacy rack stock may predate QR traceable balances.
    const before = Number(traceable.quantity_current);
    const quantity = Number(quantityKg);
    if (!Number.isFinite(quantity) || quantity <= 0 || before + 0.001 < quantity) {
      throw Object.assign(new Error(`El saldo trazable del rack ${rack.rack_code} no cubre ${quantityKg} kg de consumo.`), { statusCode: 409 });
    }
    const after = Number((before - quantity).toFixed(3));
    traceable.quantity_current = after;
    traceable.status = after <= 0.001 ? 'CONSUMIDO' : 'DISPONIBLE';
    await traceable.save({ transaction });
    await TraceabilityMovement.create({
      traceable_item_id: traceable.id,
      qr_code_id: qr.id,
      movement_type: movementType,
      from_area_id: movementContext.from_area_id || null,
      to_area_id: movementContext.to_area_id || null,
      quantity,
      unit: 'KG',
      balance_after: after,
      reference_folio: referenceFolio || null,
      performed_by: userId || null,
      notes: notes || `Consumo de PTI del rack ${rack.rack_code} en Telares.`,
      metadata: { rack_id: rack.id, rack_code: rack.rack_code, ...movementContext },
    }, { transaction });
    return { balance_before: before, balance_after: after };
  }

  async getSubareas() {
    const area = await Area.findOne({ where: { code: 'TELARES' } });
    if (!area) return [];
    return Subarea.findAll({ where: { area_id: area.id, is_active: true }, attributes: ['id', 'name', 'nomenclature'], order: [['id', 'ASC']] });
  }

  async resolvePtiSubareaId(ptiProduct, transaction) {
    const area = await Area.findOne({ where: { code: 'TELARES' }, transaction });
    if (!area) throw Object.assign(new Error('No existe el área Telares para resolver el destino del PTI.'), { statusCode: 409 });
    const configuredSubarea = String(ptiProduct?.telares_subarea_code || '').toUpperCase();
    if (configuredSubarea === 'NO_APLICA') throw Object.assign(new Error(`El PTI ${ptiProduct?.code || ''} no tiene destino a Telares.`), { statusCode: 409 });
    const nomenclature = configuredSubarea === 'TELARES_BANDA'
      ? 'TB'
      : configuredSubarea === 'TELARES_ROLLO'
        ? 'TR'
        : Number(ptiProduct?.extrusion_machine_number) === 1
          ? 'TB'
          : [2, 4, 5].includes(Number(ptiProduct?.extrusion_machine_number)) ? 'TR' : null;
    if (!nomenclature) throw Object.assign(new Error(`El PTI ${ptiProduct?.code || ''} no tiene una subárea de Telares válida configurada.`), { statusCode: 409, code: 'PTI_TELARES_SUBAREA_UNRESOLVED' });
    const subarea = await Subarea.findOne({ where: { area_id: area.id, nomenclature, is_active: true }, transaction });
    if (!subarea) {
      const destination = nomenclature === 'TB' ? 'Telares Banda' : 'Telares Rollo';
      throw Object.assign(new Error(`No está configurada la subárea ${destination} requerida por el PTI ${ptiProduct?.code || ''}.`), { statusCode: 409 });
    }
    return subarea.id;
  }

  /**
   * Listar operadores y supervisores de Tejido / Telares (con número de nómina)
   */
  async getTejidoOperators(includeInactive = false) {
    const users = await User.findAll({
      include: [
        {
          model: Role,
          as: 'role',
          include: [{ model: Area, as: 'area' }],
        },
      ],
      where: includeInactive ? {} : { is_active: true },
      order: [['first_name', 'ASC']],
    });

    return users
      .filter((u) => {
        const areaId = u.role?.area_id;
        const roleCode = u.role?.code || '';
        const roleName = (u.role?.name || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        return (
          areaId === 3 ||
          roleCode.includes('TELARES') ||
          roleName.includes('telar') ||
          username.includes('tel') ||
          u.numero_nomina === '1200' ||
          u.numero_nomina === '1201' ||
          u.numero_nomina === '1202' ||
          u.numero_nomina === '1203' ||
          u.numero_nomina === '1150'
        );
      })
      .map((u) => ({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
        username: u.username,
        email: u.email,
        telefono: u.telefono,
        numero_nomina: u.numero_nomina || null,
        role_id: u.role_id,
        role_name: u.role?.name || 'Operador de Telares',
        role_code: u.role?.code || 'OPERADOR_TELARES',
        area_name: u.role?.area?.name || 'Telares',
        is_active: u.is_active,
        created_at: u.created_at || u.createdAt,
      }));
  }

  /**
   * Registrar nuevo operador o supervisor de Tejido / Telares
   */
  async createTejidoOperator(payload) {
    const firstName = String(payload.first_name || '').trim();
    const lastName = String(payload.last_name || '').trim();
    const username = String(payload.username || '').trim().toLowerCase();
    const nomina = String(payload.numero_nomina || '').trim();

    if (!firstName || !username || !nomina) {
      throw new Error('Nombre, usuario y número de nómina son obligatorios.');
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      throw new Error(`El nombre de usuario "${username}" ya está registrado.`);
    }

    const existingNomina = await User.findOne({ where: { numero_nomina: nomina } });
    if (existingNomina) {
      throw new Error(`El número de nómina "${nomina}" ya pertenece al usuario ${existingNomina.first_name} ${existingNomina.last_name}.`);
    }

    const rawPassword = payload.password || 'Admin123!';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const email = payload.email || `${username}@empresa.com`;
    const roleId = Number(payload.role_id) || 28; // Default: Operador de Telares (28)

    const newUser = await User.create({
      first_name: firstName,
      last_name: lastName,
      username,
      numero_nomina: nomina,
      telefono: payload.telefono || null,
      email,
      password: passwordHash,
      role_id: roleId,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
    });

    return await User.findByPk(newUser.id, {
      include: [{ model: Role, as: 'role', include: [{ model: Area, as: 'area' }] }],
    });
  }

  /**
   * Actualizar datos de operador / supervisor de Telares
   */
  async updateTejidoOperator(id, payload) {
    const user = await User.findByPk(id, {
      include: [{ model: Role, as: 'role', include: [{ model: Area, as: 'area' }] }],
    });
    if (!user) throw new Error(`Operador ID ${id} no encontrado.`);

    const updates = {};
    if (payload.first_name !== undefined) updates.first_name = String(payload.first_name).trim();
    if (payload.last_name !== undefined) updates.last_name = String(payload.last_name).trim();
    if (payload.telefono !== undefined) updates.telefono = payload.telefono ? String(payload.telefono).trim() : null;
    if (payload.email !== undefined) updates.email = String(payload.email).trim().toLowerCase();
    if (payload.is_active !== undefined) updates.is_active = Boolean(payload.is_active);
    if (payload.role_id !== undefined) updates.role_id = Number(payload.role_id);

    if (payload.numero_nomina !== undefined) {
      const nomina = String(payload.numero_nomina).trim();
      if (nomina && nomina !== user.numero_nomina) {
        const existingNomina = await User.findOne({ where: { numero_nomina: nomina, id: { [Op.ne]: id } } });
        if (existingNomina) {
          throw new Error(`El número de nómina "${nomina}" ya está asignado a otro usuario.`);
        }
        updates.numero_nomina = nomina;
      }
    }

    if (payload.password) {
      updates.password = await bcrypt.hash(payload.password, 10);
    }

    await user.update(updates);
    return await User.findByPk(id, {
      include: [{ model: Role, as: 'role', include: [{ model: Area, as: 'area' }] }],
    });
  }

  /**
   * Desactivar o eliminar operador
   */
  async deleteTejidoOperator(id) {
    const user = await User.findByPk(id);
    if (!user) throw new Error(`Operador ID ${id} no encontrado.`);
    await user.update({ is_active: false });
    return { id: user.id, is_active: false, message: 'Operador desactivado exitosamente.' };
  }

  /**
   * Listar todos los telares con sus Racks Maestros activos, BOM actual y WIP interno de Creel (1800 bobinas)
   */
  async getLooms(includeInactive = false) {
    return await Loom.findAll({
      where: includeInactive ? {} : { is_active: true },
      include: [
        { model: Subarea, as: 'subarea', attributes: ['id', 'name', 'nomenclature'] },
        {
          model: PtiRack,
          as: 'warpRack',
          include: [{ model: PtiProduct, as: 'currentPtiProduct' }],
        },
        {
          model: PtiRack,
          as: 'weftRack',
          include: [{ model: PtiProduct, as: 'currentPtiProduct' }],
        },
        {
          model: ProductionBom,
          as: 'currentBom',
          include: [{ model: ProductionBomItem, as: 'items', include: ['ptiProduct'] }],
        },
        {
          model: LoomRun,
          as: 'runs',
          where: { status: 'EN_PROCESO' },
          required: false,
          include: [
            { model: ProductionBom, as: 'bom' },
            { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username', 'numero_nomina'] },
          ],
        },
      ],
      order: [
        [sequelize.literal('COALESCE("Loom"."loom_number", "Loom"."id")'), 'ASC'],
      ],
    });
  }

  /**
   * Listar recetas / BOMs de producción con especificaciones de tela
   */
  async getBoms(includeInactive = false) {
    const boms = await ProductionBom.findAll({
      where: includeInactive ? {} : { is_active: true },
      include: [
        { model: Subarea, as: 'subarea', attributes: ['id', 'name', 'nomenclature'], required: false },
        {
          model: ProductionBomItem,
          as: 'items',
          include: [
            { model: PtiProduct, as: 'ptiProduct' },
            { model: Material, as: 'material' },
          ],
        },
      ],
      order: [
        [sequelize.literal('COALESCE(ounces_yd2, 0)'), 'ASC'],
        ['id', 'ASC'],
      ],
    });
    return boms.map((bom) => ({ ...bom.toJSON(), catalog_qr_value: getTelaresPtiCatalogQr(bom) }));
  }

  /**
   * Crear o actualizar Telar (incluyendo número del 1 al 21, creel de 1800 bobinas y subárea)
   */
  async saveLoom(payload, id = null) {
    const t = await sequelize.transaction();
    try {
      let loom = id ? await Loom.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE }) : null;
      if (id && !loom) throw new Error(`Telar ID ${id} no encontrado.`);
      const code = String(payload.code ?? loom?.code ?? '').trim().toUpperCase();
      const name = String(payload.name ?? loom?.name ?? '').trim();
      if (!code || !name) throw new Error('El código y el nombre del telar son obligatorios.');

      const ptiIds = [...new Set((payload.supported_pti_types ?? loom?.supported_pti_types ?? []).map(Number))];
      if (ptiIds.some((value) => !Number.isInteger(value) || value <= 0)) throw new Error('La lista de PTI compatibles contiene un valor no válido.');
      if (ptiIds.length && (await PtiProduct.count({ where: { id: ptiIds }, transaction: t })) !== ptiIds.length) {
        throw new Error('Uno o más PTI compatibles no existen en el catálogo de Extrusión.');
      }

      const bomIds = [...new Set((payload.supported_bom_ids ?? loom?.supported_bom_ids ?? []).map(Number))];
      if (bomIds.some((value) => !Number.isInteger(value) || value <= 0)) throw new Error('La lista de rollos compatibles contiene un valor no válido.');
      if (bomIds.length && (await ProductionBom.count({ where: { id: bomIds }, transaction: t })) !== bomIds.length) {
        throw new Error('Uno o más rollos compatibles no existen en el catálogo de Telares.');
      }

      const loomNumber = payload.loom_number !== undefined
        ? (payload.loom_number ? Number(payload.loom_number) : null)
        : (loom?.loom_number ?? (parseInt(code.replace(/\D/g, ''), 10) || null));

      const requestedCreelCapacity = payload.creel_capacity_spools !== undefined
        ? (payload.creel_capacity_spools === null || payload.creel_capacity_spools === '' ? null : Number(payload.creel_capacity_spools))
        : (loom?.creel_capacity_spools == null ? null : Number(loom.creel_capacity_spools));

      const values = {
        code,
        name,
        loom_number: loomNumber,
        creel_capacity_spools: requestedCreelCapacity ?? 1800,
        current_spools_count: Number(payload.current_spools_count ?? loom?.current_spools_count ?? 0),
        current_wip_kg: Number(payload.current_wip_kg ?? loom?.current_wip_kg ?? 0),
        model: payload.model ?? loom?.model ?? 'LOHIA LSL-6',
        type: payload.type ?? loom?.type ?? 'CIRCULAR',
        rpm: Number(payload.rpm ?? loom?.rpm ?? 120),
        status: payload.status ?? loom?.status ?? 'DISPONIBLE',
        specifications: payload.specifications ?? loom?.specifications ?? null,
        supported_pti_types: ptiIds,
        supported_bom_ids: bomIds,
        is_active: payload.is_active ?? loom?.is_active ?? true,
        subarea_id: payload.subarea_id === undefined ? (loom?.subarea_id ?? null) : (payload.subarea_id ? Number(payload.subarea_id) : null),
      };

      if (values.subarea_id === null) throw new Error('Selecciona si este telar pertenece a Rollo o a Banda.');
      const subarea = await Subarea.findOne({
          where: { id: values.subarea_id, is_active: true },
          include: [{ model: Area, where: { code: 'TELARES' }, required: true }],
          transaction: t,
      });
      if (!subarea) throw new Error('La subárea seleccionada no pertenece al área de Telares.');
      const isBandSubarea = /banda/i.test(subarea.name);
      if ((String(values.type).toUpperCase() === 'BANDA') !== isBandSubarea) throw new Error('El tipo del telar no corresponde a la subárea seleccionada.');
      if (requestedCreelCapacity == null && isBandSubarea) {
        throw new Error('Indica la capacidad individual de bobinas del WIP para este telar Banda.');
      }
      const creelCapacity = requestedCreelCapacity ?? 1800;
      if (!Number.isInteger(creelCapacity) || creelCapacity <= 0) throw new Error('La capacidad individual del WIP debe ser un número entero mayor a cero.');
      if (Number(values.current_spools_count || 0) > creelCapacity) throw new Error('La capacidad individual no puede ser menor que las bobinas que ya están cargadas en el telar.');
      values.creel_capacity_spools = creelCapacity;
      const selectedPtis = ptiIds.length ? await PtiProduct.findAll({ where: { id: ptiIds }, transaction: t }) : [];
      if (selectedPtis.some((pti) => getExpectedPtiTelaresRoute(pti) !== (isBandSubarea ? 'TELARES_BANDA' : 'TELARES_ROLLO'))) {
        throw new Error('Las bobinas PTI de la Extrusora 1 solo pueden configurarse en Tejido Banda; las demás extrusoras corresponden a Tejido Tela.');
      }
      const selectedBoms = bomIds.length ? await ProductionBom.findAll({ where: { id: bomIds }, transaction: t }) : [];
      if (selectedBoms.some((bom) => Number(bom.subarea_id || 0) !== Number(values.subarea_id))) {
        throw new Error('Las fichas PTI seleccionadas deben pertenecer a la misma subárea que el telar.');
      }
      if (!Number.isFinite(values.rpm) || values.rpm <= 0) throw new Error('La velocidad RPM debe ser mayor a cero.');
      if (loom) await loom.update(values, { transaction: t });
      else loom = await Loom.create(values, { transaction: t });
      await t.commit();
      return loom;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deactivateLoom(id) {
    const loom = await Loom.findByPk(id);
    if (!loom) throw new Error(`Telar ID ${id} no encontrado.`);
    const activeRun = await LoomRun.findOne({ where: { loom_id: id, status: 'EN_PROCESO' } });
    if (activeRun) throw new Error(`No se puede desactivar ${loom.name}: tiene una corrida activa.`);
    await loom.update({ is_active: false, status: 'DETENIDO' });
    return { id: loom.id, is_active: false };
  }

  /**
   * Cargar bobinas desde un Carrito de Transporte / Rack de Extrusión hacia el Creel/Fileta interna del Telar (hasta 1,800 bobinas).
   * La modalidad vigente define si se admite transferencia parcial desde rack o transferencia íntegra desde carrito.
   * En ambos modos el débito del origen, el ingreso al WIP del telar y el movimiento de trazabilidad son atómicos.
   */
  async loadLoomCreel({ loom_id, rack_id, spools_to_load, scanned_qr, operator_id }) {
    const t = await sequelize.transaction();
    try {
      const configuredTransferMode = await this.getPtiTransferMode(t);
      const loom = await Loom.findByPk(loom_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!loom) throw new Error(`Telar ID ${loom_id} no encontrado.`);

      const rack = await PtiRack.findByPk(rack_id, {
        include: [{ model: PtiProduct, as: 'currentPtiProduct' }],
        transaction: t,
        // Lock only the rack row. PostgreSQL cannot FOR UPDATE the nullable
        // side of the optional PTI LEFT JOIN.
        lock: { level: t.LOCK.UPDATE, of: PtiRack },
      });
      if (!rack) throw new Error(`Carrito / Rack Maestro ID ${rack_id} no encontrado.`);
      if (rack.custody_shift_session_id) {
        throw Object.assign(new Error(`El rack ${rack.rack_code} está en custodia del turno de Extrusión y no puede moverse hasta que ese turno se cierre.`), { statusCode: 409, code: 'PTI_RACK_SHIFT_LOCKED' });
      }

      const scannedQr = String(scanned_qr || '').trim();
      if (!scannedQr) {
        throw Object.assign(new Error('Escanea el QR original del rack o carrito antes de transferir bobinas.'), { statusCode: 400, code: 'PTI_CONTAINER_QR_REQUIRED' });
      }
      if (scannedQr !== String(rack.qr_code || '').trim()) {
        throw Object.assign(new Error('El QR escaneado no corresponde al rack o carrito seleccionado.'), { statusCode: 409, code: 'PTI_CONTAINER_QR_MISMATCH' });
      }

      const isCart = String(rack.container_type || 'RACK').trim().toUpperCase() === 'CARRITO';
      const transferMode = isCart ? 'CART_FULL' : 'RACK_PARTIAL';
      if (configuredTransferMode !== transferMode) {
        const expectedModeLabel = isCart ? 'Carrito completo' : 'Rack parcial';
        throw Object.assign(new Error(`El contenedor escaneado es ${isCart ? 'un carrito' : 'un rack'}, pero el modo activo es ${configuredTransferMode === 'CART_FULL' ? 'Carrito completo' : 'Rack parcial'}. Cambia el modo a ${expectedModeLabel} para continuar.`), { statusCode: 409, code: 'PTI_CONTAINER_MODE_MISMATCH' });
      }

      const availableInRack = Number(rack.current_quantity || 0);
      if (availableInRack <= 0) {
        throw new Error(`El carrito / rack ${rack.rack_code} no contiene bobinas disponibles (está vacío).`);
      }

      if (transferMode === 'RACK_PARTIAL' && (spools_to_load === undefined || spools_to_load === null)) {
        const error = new Error('El modo rack parcial requiere indicar cuántas bobinas cambian de custodia.');
        error.statusCode = 400;
        throw error;
      }
      const requestedSpools = spools_to_load === undefined || spools_to_load === null ? availableInRack : Number(spools_to_load);
      if (!Number.isFinite(requestedSpools) || requestedSpools <= 0 || requestedSpools > availableInRack) {
        const error = new Error(`La cantidad solicitada debe ser mayor a cero y no superar las ${availableInRack.toFixed(2)} bobinas disponibles.`);
        error.statusCode = 400;
        throw error;
      }
      if (!Number.isInteger(requestedSpools)) {
        const error = new Error('La transferencia debe expresarse en bobinas completas; no se permiten fracciones de bobina.');
        error.statusCode = 400;
        throw error;
      }
      if (transferMode === 'CART_FULL' && Math.abs(requestedSpools - availableInRack) > 0.0001) {
        const error = new Error(`Modo carrito completo activo: deben transferirse las ${availableInRack.toFixed(2)} bobinas del carrito, sin fraccionarlo.`);
        error.statusCode = 409;
        throw error;
      }
      const spools = transferMode === 'CART_FULL' ? availableInRack : requestedSpools;

      const ptiProduct = rack.currentPtiProduct;
      if (!ptiProduct || !rack.current_pti_product_id) {
        const error = new Error(`El rack ${rack.rack_code} no tiene un PTI exacto identificado (producto, color y características).`);
        error.statusCode = 409;
        throw error;
      }
      if (isDirectExtrusionPtiRoute(rack)) {
        const routeLabel = rack.destination_route || 'sin ruta verificada';
        throw Object.assign(new Error(`El PTI ${ptiProduct.code} salió de Extrusión con ruta directa (${routeLabel}). No se puede ingresar a Telares; debe continuar únicamente al destino registrado en su QR.`), { statusCode: 409, code: 'PTI_DIRECT_ROUTE_BLOCKED' });
      }

      assertRackAuthorizedForTelares(rack, ptiProduct);
      const expectedPtiSubareaId = await this.resolvePtiSubareaId(ptiProduct, t);
      if (rack.destination_route && rack.destination_route !== getExpectedPtiTelaresRoute(ptiProduct)) {
        throw Object.assign(new Error(`El PTI ${ptiProduct.code} está asignado a ${rack.destination_route}, no a la ruta de este telar.`), { statusCode: 409, code: 'PTI_TELARES_ROUTE_MISMATCH' });
      }
      const requiredSubareaId = rack.destination_subarea_id || expectedPtiSubareaId;
      if (Number(requiredSubareaId) !== Number(expectedPtiSubareaId)) {
        throw Object.assign(new Error(`El PTI ${ptiProduct.code} tiene destino fijo a ${getExpectedPtiTelaresRoute(ptiProduct) === 'TELARES_BANDA' ? 'Telares Banda' : 'Telares Rollo'}.`), { statusCode: 409 });
      }
      if (Number(requiredSubareaId || 0) !== Number(loom.subarea_id || 0)) {
        const destination = requiredSubareaId ? 'Telares Banda' : 'Telares general';
        const error = new Error(`El PTI ${ptiProduct.code} está destinado a ${destination} y no puede transferirse al telar ${loom.name}.`);
        error.statusCode = 409;
        throw error;
      }

      const supportedPtiIds = Array.isArray(loom.supported_pti_types) ? loom.supported_pti_types.map(Number) : [];
      if (supportedPtiIds.length && !supportedPtiIds.includes(Number(ptiProduct.id))) {
        const error = new Error(`El telar ${loom.name} no admite el PTI ${ptiProduct.code} (${ptiProduct.color || 'color no definido'}).`);
        error.statusCode = 409;
        throw error;
      }
      const activeRun = await LoomRun.findOne({ where: { loom_id: loom.id, status: 'EN_PROCESO' }, transaction: t });
      const requiredBomIds = activeRun?.bom_id
        ? [Number(activeRun.bom_id)]
        : (loom.current_bom_id ? [Number(loom.current_bom_id)] : (Array.isArray(loom.supported_bom_ids) ? loom.supported_bom_ids.map(Number) : []));
      if (requiredBomIds.length) {
        const bomItem = await ProductionBomItem.findOne({
          where: { bom_id: { [Op.in]: requiredBomIds }, pti_product_id: ptiProduct.id },
          transaction: t,
        });
        if (!bomItem) {
          const error = new Error(`El PTI ${ptiProduct.code} (${ptiProduct.color || 'color no definido'}, ${ptiProduct.tape_width_mm || 'ancho s/d'} mm) no está requerido por los modelos/fichas configurados para ${loom.name}.`);
          error.statusCode = 409;
          throw error;
        }
      }

      const maxCreel = Number(loom.creel_capacity_spools || 1800);
      const currentSpools = Number(loom.current_spools_count || 0);
      if (currentSpools + spools > maxCreel) {
        const free = Math.max(0, maxCreel - currentSpools);
        const error = new Error(`La transferencia (${spools} bobinas) excede la capacidad disponible de la fileta del Telar ${loom.name} (${maxCreel} bobinas máx). Actualmente tiene ${currentSpools.toFixed(0)} bobinas montadas (Espacio libre: ${free} bobinas).`);
        error.statusCode = 400;
        throw error;
      }

      const unitWeight = Number(rack.unit_weight_kg || ptiProduct.unit_weight_kg || 0);
      if (!Number.isFinite(unitWeight) || unitWeight <= 0) {
        const error = new Error(`El PTI ${ptiProduct.code} no tiene peso unitario registrado. Captura el peso real antes de transferirlo para no estimar WIP ni valor.`);
        error.statusCode = 409;
        throw error;
      }
      // Keep the PTI catalog's 3-decimal unit-weight precision when debiting
      // the source QR balance; rounding to 2 decimals can exceed its balance.
      const addedWeightKg = parseFloat((spools * unitWeight).toFixed(3));
      const newLoomSpools = parseFloat((currentSpools + spools).toFixed(3));
      const newLoomWipKg = parseFloat((Number(loom.current_wip_kg || 0) + addedWeightKg).toFixed(3));
      const newRackBalance = parseFloat((availableInRack - spools).toFixed(3));

      const sourceProductionEntry = await ExtrusionProductionEntry.findOne({
        where: { rack_id: rack.id, voided_at: null },
        order: [['recorded_at', 'DESC'], ['id', 'DESC']],
        transaction: t,
      });
      await LoomPtiWip.create({
        loom_id: loom.id,
        pti_product_id: ptiProduct.id,
        source_rack_id: rack.id,
        source_production_entry_id: sourceProductionEntry?.id || null,
        source_extruder_id: sourceProductionEntry?.extruder_id || ptiProduct.extrusion_machine_number || null,
        destination_subarea_id: requiredSubareaId,
        source_qr_code: rack.qr_code,
        color_snapshot: ptiProduct.color || null,
        denier_snapshot: ptiProduct.denier || null,
        tape_width_mm_snapshot: ptiProduct.tape_width_mm || null,
        quantity_received_spools: spools,
        quantity_remaining_spools: spools,
        unit_weight_kg: unitWeight,
        unit_cost_per_kg: rack.unit_cost_per_kg == null ? null : Number(rack.unit_cost_per_kg),
        received_by: operator_id || null,
        received_at: new Date(),
      }, { transaction: t });

      // La cantidad transferida, completa o parcial según modo, sale de la custodia de Extrusión.
      await rack.update(
        {
          current_quantity: newRackBalance,
          status: newRackBalance === 0 ? 'VACIO' : 'DISPONIBLE',
        },
        { transaction: t }
      );

      // 2. Registrar trazabilidad atómica
      const extrusionArea = await Area.findOne({ where: { code: 'EXTRUSION' }, transaction: t });
      const telaresArea = await Area.findOne({ where: { code: 'TELARES' }, transaction: t });
      await this.debitRackTraceability(
        rack,
        addedWeightKg,
        t,
        `TRANSFERENCIA-PTI-TELAR-${loom.id}-${Date.now()}`,
        operator_id,
        `Transferencia ${transferMode === 'CART_FULL' ? 'completa de carrito' : 'parcial de rack'} (${spools} bobinas, ${addedWeightKg} kg) de Extrusión al WIP del Telar ${loom.name}.`,
        'TRANSFERENCIA_AREA',
        {
          from_area_id: extrusionArea?.id || null,
          to_area_id: telaresArea?.id || null,
          to_loom_id: loom.id,
          to_subarea_id: requiredSubareaId,
          pti_product_id: ptiProduct.id,
          transfer_mode: transferMode,
        }
      );

      // 3. Acreditar WIP al Telar destino
      await loom.update(
        {
          current_spools_count: newLoomSpools,
          current_wip_kg: newLoomWipKg,
        },
        { transaction: t }
      );

      await t.commit();
      return {
        success: true,
        message: `Transferencia ${transferMode === 'CART_FULL' ? 'completa del carrito' : 'parcial desde rack'}: ${spools} bobinas (${addedWeightKg} kg) recibidas en el WIP del Telar ${loom.name}. Ocupación actual: ${newLoomSpools.toFixed(0)} / ${maxCreel} bobinas.`,
        loom: {
          id: loom.id,
          name: loom.name,
          current_spools_count: newLoomSpools,
          current_wip_kg: newLoomWipKg,
          creel_capacity_spools: maxCreel,
        },
        rack: {
          id: rack.id,
          rack_code: rack.rack_code,
          current_quantity: newRackBalance,
          status: newRackBalance === 0 ? 'VACIO' : 'DISPONIBLE',
        },
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Asignación directa y transferencia atómica de Carrito de Transporte PTI al Telar especificado (1 a 21)
   */
  async assignCartToLoom({ loom_id, rack_id, cart_qr, spools_to_load, operator_id }) {
    let rack = null;
    if (rack_id) {
      rack = await PtiRack.findByPk(rack_id);
    } else if (cart_qr) {
      rack = await PtiRack.findOne({
        where: {
          [Op.or]: [
            { qr_code: String(cart_qr).trim() },
            { rack_code: String(cart_qr).trim() }
          ]
        }
      });
    }
    if (!rack) {
      const error = new Error(`Carrito de transporte PTI '${cart_qr || rack_id}' no encontrado.`);
      error.statusCode = 404;
      throw error;
    }
    return await this.loadLoomCreel({
      loom_id: Number(loom_id),
      rack_id: Number(rack.id),
      spools_to_load: spools_to_load === undefined ? undefined : Number(spools_to_load),
      operator_id
    });
  }

  /**
   * Crear o actualizar Ficha Técnica / Receta de Tela / Banda
   * Incluye especificaciones del PDF (onzas, cinta de identificación, deniers, índice de costo transformado)
   * y validación estricta de restricción técnica (6.5 a 8.0 oz no permite denier 1800)
   */
  async saveBom(payload, id = null, currentUser = null) {
    const t = await sequelize.transaction();
    try {
      let bom = id ? await ProductionBom.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE }) : null;
      if (id && !bom) throw new Error(`Rollo/BOM ID ${id} no encontrado.`);
      const code = String(payload.code ?? bom?.code ?? '').trim().toUpperCase();
      const name = String(payload.name ?? bom?.name ?? '').trim();
      const items = payload.items ?? (bom ? await ProductionBomItem.findAll({ where: { bom_id: bom.id }, transaction: t }) : []);
      if (!code || !name) throw new Error('El código y el nombre del rollo son obligatorios.');
      const isProvisional = payload.is_provisional ?? bom?.is_provisional ?? false;
      const productKind = String(payload.product_kind ?? bom?.product_kind ?? 'ROLLO_TELA').trim().toUpperCase();
      if (!Array.isArray(items) || (!items.length && !isProvisional)) throw new Error('Agrega al menos un PTI de Extrusión o marca la ficha como provisional mientras se confirma su relación de consumo.');

      const routeSource = payload.default_route ?? bom?.default_route;
      if (!routeSource || (Array.isArray(routeSource) && routeSource.length === 0)) {
        throw Object.assign(new Error('Selecciona explícitamente la ruta autorizada para esta ficha.'), { statusCode: 400, code: 'PRODUCTION_ROUTE_REQUIRED' });
      }
      const route = this.normalizeProductionRoute(routeSource, productKind);
      const allowedRouteSources = payload.allowed_routes ?? bom?.allowed_routes ?? [route];
      if (!Array.isArray(allowedRouteSources) || allowedRouteSources.length === 0) {
        throw Object.assign(new Error('Autoriza al menos una ruta para esta ficha técnica.'), { statusCode: 400, code: 'ALLOWED_ROUTES_REQUIRED' });
      }
      const allowedRoutes = allowedRouteSources.map((allowedRoute) => this.normalizeProductionRoute(allowedRoute, productKind));
      const routeKey = (candidate) => JSON.stringify(candidate.map((stage) => String(stage).toUpperCase()));
      if (!allowedRoutes.some((allowedRoute) => routeKey(allowedRoute) === routeKey(route))) {
        throw Object.assign(new Error('La ruta preferida debe estar incluida entre las rutas autorizadas de la ficha.'), { statusCode: 400, code: 'DEFAULT_ROUTE_NOT_ALLOWED' });
      }

      const ounces = payload.ounces_yd2 !== undefined && payload.ounces_yd2 !== ''
        ? Number(payload.ounces_yd2)
        : (bom?.ounces_yd2 ? Number(bom.ounces_yd2) : null);

      const weftDenierStr = String(payload.weft_denier ?? bom?.weft_denier ?? '').trim();
      const warpDenierStr = String(payload.warp_denier ?? bom?.warp_denier ?? '').trim();

      // RESTRICCIÓN TÉCNICA ESTRICTA (PDF Pág 1):
      // "CONSIDERAR COMO RESTRICCIÓN PARA LAS TELAS TUBULARES O PLANAS DE 6.5 OZ A 8.0 OZ NO SE PUEDE EMPLEAR TRAMA NI URDIMBRE DENIER 1800"
      const restrictDenier1800 = ounces !== null && ounces >= 6.5 && ounces <= 8.0;
      if (restrictDenier1800) {
        if (weftDenierStr.includes('1800')) {
          throw new Error('Restricción técnica: Para telas de 6.5 oz a 8.0 oz NO se puede emplear TRAMA de denier 1800.');
        }
        if (warpDenierStr.includes('1800')) {
          throw new Error('Restricción técnica: Para telas de 6.5 oz a 8.0 oz NO se puede emplear URDIMBRE de denier 1800.');
        }
      }

      const fabricType = String(payload.fabric_type ?? bom?.fabric_type ?? 'TUBULAR').trim().toUpperCase();
      const requestedTapeColor = payload.tape_color !== undefined
        ? String(payload.tape_color || 'N/A').trim().toUpperCase()
        : (fabricType === 'PLANA' ? 'N/A' : String(bom?.tape_color || 'N/A').trim().toUpperCase());
      if (productKind === 'ROLLO_TELA' && fabricType === 'PLANA' && requestedTapeColor !== 'N/A') {
        throw new Error('Restricción técnica (PDF Pág. 1): Todas las telas planas NO llevan cinta de identificación (debe ser N/A).');
      }

      const telaresArea = await Area.findOne({ where: { code: 'TELARES' }, transaction: t });
      const subareaId = payload.subarea_id === '' || payload.subarea_id === null || payload.subarea_id === undefined
        ? (bom?.subarea_id ?? null) : Number(payload.subarea_id);
      const outputSubarea = telaresArea && subareaId
        ? await Subarea.findOne({ where: { id: subareaId, area_id: telaresArea.id, is_active: true }, transaction: t })
        : null;
      if (!outputSubarea) throw new Error('Selecciona una subárea activa de Telares para esta ficha.');
      const isBandSubarea = /banda/i.test(outputSubarea.name);

      const normalizedItems = [];
      for (const item of items) {
        const ptiId = Number(item.pti_product_id);
        const pti = ptiId > 0 ? await PtiProduct.findByPk(ptiId, { transaction: t }) : null;
        if (!pti || !pti.is_active) throw new Error('Cada componente debe ser un PTI activo del catálogo de Extrusión.');
        if (getExpectedPtiTelaresRoute(pti) !== (isBandSubarea ? 'TELARES_BANDA' : 'TELARES_ROLLO')) {
          throw new Error(`El PTI ${pti.code} no corresponde a ${isBandSubarea ? 'Telares Banda (Extrusora 1)' : 'Telares Rollo (Extrusoras 2, 4, 5 o dinámicas)'}.`);
        }

        // Validar denier del PTI según restricción
        if (restrictDenier1800 && Number(pti.denier) === 1800) {
          throw new Error(`Restricción técnica violada: El PTI '${pti.code}' tiene denier 1800, el cual está estrictamente prohibido para telas de 6.5 oz a 8.0 oz.`);
        }

        const role = String(item.role || '').trim().toUpperCase();
        if (!['URDIMBRE', 'TRAMA', 'AMBOS', 'REFUERZO'].includes(role)) throw new Error(`Rol de componente no válido para el PTI ${pti.code}.`);
        const ratio = Number(item.ratio_percentage ?? 0);
        const consumption = Number(item.consumption_g_per_m ?? 0);
        const consumptionPerMeter = item.consumption_per_meter === '' || item.consumption_per_meter === null || item.consumption_per_meter === undefined
          ? null
          : Number(item.consumption_per_meter);
        const consumptionPerMeterUnit = String(item.consumption_per_meter_unit || 'KG').toUpperCase();
        const requiredQuantity = item.required_quantity === '' || item.required_quantity === null || item.required_quantity === undefined
          ? null
          : Number(item.required_quantity);
        const requiredUnit = String(item.required_unit || 'KG').toUpperCase();
        if (!Number.isFinite(ratio) || ratio < 0 || ratio > 100 || !Number.isFinite(consumption) || consumption < 0 || (consumptionPerMeter !== null && (!Number.isFinite(consumptionPerMeter) || consumptionPerMeter < 0))) throw new Error(`Consumo o proporción no válida para ${pti.code}.`);
        if (requiredQuantity !== null && (!Number.isFinite(requiredQuantity) || requiredQuantity <= 0)) throw new Error(`La cantidad de PTI por salida debe ser mayor a cero para ${pti.code}.`);
        if (!['KG', 'PIEZAS'].includes(consumptionPerMeterUnit)) throw new Error('La unidad de consumo por metro debe ser KG o PIEZAS.');
        if (!isProvisional && requiredQuantity === null && consumption <= 0 && !(consumptionPerMeter > 0)) throw new Error(`Completa el consumo por metro o por base del PTI ${pti.code}, o marca la ficha como provisional.`);
        if (!['KG', 'PIEZAS'].includes(requiredUnit)) throw new Error('La unidad requerida debe ser KG o PIEZAS.');
        normalizedItems.push({
          pti_product_id: pti.id,
          role,
          ratio_percentage: ratio,
          consumption_g_per_m: consumption,
          consumption_per_meter: consumptionPerMeter,
          consumption_per_meter_unit: consumptionPerMeterUnit,
          required_quantity: requiredQuantity,
          required_unit: requiredUnit,
          notes: item.notes || null,
        });
      }

      // El supervisor no puede alterar costos o índices de transformación
      let costIndex = 1.0000;
      if (currentUser && isSupervisor(currentUser)) {
        costIndex = bom?.cost_transformation_index ? Number(bom.cost_transformation_index) : 1.0000;
      } else {
        costIndex = Number(payload.cost_transformation_index ?? bom?.cost_transformation_index ?? 1.0000);
      }
      if (!Number.isFinite(costIndex) || costIndex <= 0) {
        throw new Error('El índice de transformación de costo debe ser mayor a cero.');
      }

      const values = {
        code,
        name,
        description: payload.description ?? bom?.description ?? null,
        target_width_cm: Number(payload.target_width_cm ?? bom?.target_width_cm ?? 0),
        target_weight_g_per_m: Number(payload.target_weight_g_per_m ?? bom?.target_weight_g_per_m ?? 0),
        weight_conversion_width_m: payload.weight_conversion_width_m === '' || payload.weight_conversion_width_m === null
          ? null : Number(payload.weight_conversion_width_m ?? bom?.weight_conversion_width_m ?? 0) || null,
        weight_conversion_factor: payload.weight_conversion_factor === '' || payload.weight_conversion_factor === null
          ? null : Number(payload.weight_conversion_factor ?? bom?.weight_conversion_factor ?? 0) || null,
        warp_density: Number(payload.warp_density ?? bom?.warp_density ?? 0),
        weft_density: Number(payload.weft_density ?? bom?.weft_density ?? 0),
        output_product_name: String(payload.output_product_name ?? bom?.output_product_name ?? name).trim(),
        subarea_id: payload.subarea_id === '' || payload.subarea_id === null || payload.subarea_id === undefined
          ? (bom?.subarea_id ?? null) : Number(payload.subarea_id),
        product_kind: productKind,
        output_color: payload.output_color ?? bom?.output_color ?? null,
        output_width_value: payload.output_width_value === '' || payload.output_width_value === null
          ? null : Number(payload.output_width_value ?? bom?.output_width_value ?? 0) || null,
        output_width_unit: String(payload.output_width_unit ?? bom?.output_width_unit ?? 'CM').toUpperCase(),
        output_denier: payload.output_denier === '' || payload.output_denier === null
          ? null : Number(payload.output_denier ?? bom?.output_denier ?? 0) || null,
        tensile_strength_lb: payload.tensile_strength_lb === '' || payload.tensile_strength_lb === null
          ? null : Number(payload.tensile_strength_lb ?? bom?.tensile_strength_lb ?? 0) || null,
        units_per_pallet: payload.units_per_pallet === '' || payload.units_per_pallet === null
          ? null : Number(payload.units_per_pallet ?? bom?.units_per_pallet ?? 0) || null,
        packaging_type: payload.packaging_type ?? bom?.packaging_type ?? null,
        output_weight_kg: payload.output_weight_kg === '' || payload.output_weight_kg === null
          ? null : Number(payload.output_weight_kg ?? bom?.output_weight_kg ?? 0) || null,
        is_provisional: isProvisional,
        expected_output_quantity: Number(payload.expected_output_quantity ?? bom?.expected_output_quantity ?? 1),
        expected_output_unit: String(payload.expected_output_unit ?? bom?.expected_output_unit ?? 'ROLLO').toUpperCase(),
        standard_output_meters: payload.standard_output_meters === '' || payload.standard_output_meters === null
          ? null
          : Number(payload.standard_output_meters ?? bom?.standard_output_meters ?? 0) || null,
        default_route: route.map((stage) => String(stage).toUpperCase()),
        allowed_routes: allowedRoutes.map((allowedRoute) => allowedRoute.map((stage) => String(stage).toUpperCase())),
        ounces_yd2: ounces,
        fabric_type: fabricType,
        tape_color: fabricType === 'PLANA' ? 'N/A' : requestedTapeColor,
        tape_denier: fabricType === 'PLANA' || !payload.tape_denier ? null : Number(payload.tape_denier),
        tape_width_mm: fabricType === 'PLANA' || !payload.tape_width_mm ? null : Number(payload.tape_width_mm),
        weft_denier: weftDenierStr || null,
        warp_denier: warpDenierStr || null,
        cost_transformation_index: costIndex,
        general_considerations: payload.general_considerations ?? bom?.general_considerations ?? null,
        is_active: isProvisional ? false : (payload.is_active ?? bom?.is_active ?? true),
      };

      if (!Number.isFinite(values.target_width_cm) || values.target_width_cm <= 0 || !Number.isFinite(values.expected_output_quantity) || values.expected_output_quantity <= 0) {
        throw new Error('El ancho y la cantidad de salida deben ser mayores a cero.');
      }
      if (!['ROLLO_TELA', 'BANDA', 'CINTA'].includes(values.product_kind)) throw new Error('El tipo de producto PTI de Telares no es válido.');
      if (values.subarea_id) {
        if (Number(values.subarea_id) !== Number(outputSubarea.id)) throw new Error('La subárea de la ficha cambió durante la validación. Vuelve a intentarlo.');
        if (['BANDA', 'CINTA'].includes(values.product_kind) !== isBandSubarea) {
          throw new Error('El tipo de producto no corresponde a la subárea seleccionada (Rollo o Banda).');
        }
      }
      if (values.standard_output_meters !== null && (!Number.isFinite(values.standard_output_meters) || values.standard_output_meters <= 0)) {
        throw new Error('Los metros de referencia de salida deben ser mayores a cero.');
      }
      if (values.weight_conversion_width_m !== null && (!Number.isFinite(values.weight_conversion_width_m) || values.weight_conversion_width_m <= 0)) {
        throw new Error('El ancho Manga para conversión debe ser mayor a cero metros.');
      }
      if (values.weight_conversion_factor !== null && (!Number.isFinite(values.weight_conversion_factor) || values.weight_conversion_factor <= 0)) {
        throw new Error('El factor de capas de conversión debe ser mayor a cero.');
      }

      if (bom) {
        await bom.update(values, { transaction: t });
        await ProductionBomItem.destroy({ where: { bom_id: bom.id }, transaction: t });
      } else {
        bom = await ProductionBom.create(values, { transaction: t });
      }
      await ProductionBomItem.bulkCreate(normalizedItems.map((item) => ({ ...item, bom_id: bom.id })), { transaction: t });
      await t.commit();
      return await ProductionBom.findByPk(bom.id, {
        include: [{ model: ProductionBomItem, as: 'items', include: [{ model: PtiProduct, as: 'ptiProduct' }] }],
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async deactivateBom(id) {
    const bom = await ProductionBom.findByPk(id);
    if (!bom) throw new Error(`Rollo/BOM ID ${id} no encontrado.`);
    const activeRun = await LoomRun.findOne({ where: { bom_id: id, status: 'EN_PROCESO' } });
    if (activeRun) throw new Error('No se puede desactivar el rollo: está vinculado a una corrida activa.');
    await bom.update({ is_active: false });
    return { id: bom.id, is_active: false };
  }

  /**
   * Asignar un Rack Maestro a un Telar (Urdimbre o Trama)
   */
  async assignRackToLoom({ loom_id, rack_id, role, operator_id }) {
    const t = await sequelize.transaction();
    try {
      const loom = await Loom.findByPk(loom_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!loom) throw new Error(`Telar ID ${loom_id} no encontrado.`);

      const rack = await PtiRack.findByPk(rack_id, {
        include: [{ model: PtiProduct, as: 'currentPtiProduct' }],
        transaction: t,
        lock: { level: t.LOCK.UPDATE, of: PtiRack },
      });
      if (!rack) throw new Error(`Rack ID ${rack_id} no encontrado.`);

      if (rack.custody_shift_session_id) {
        throw Object.assign(new Error(`El rack ${rack.rack_code} sigue en custodia del turno de Extrusión y no está disponible para Telares hasta que se cierre ese turno.`), { statusCode: 409, code: 'PTI_RACK_SHIFT_LOCKED' });
      }

      if (Number(rack.current_quantity) <= 0) {
        throw new Error(`El Rack '${rack.rack_code}' se encuentra vacío (0 bobinas disponibles).`);
      }
      const ptiProduct = rack.currentPtiProduct;
      if (!ptiProduct || !rack.current_pti_product_id) {
        throw Object.assign(new Error(`El rack ${rack.rack_code} no tiene un PTI exacto identificado.`), { statusCode: 409 });
      }
      if (isDirectExtrusionPtiRoute(rack)) {
        const routeLabel = rack.destination_route || 'sin ruta verificada';
        throw Object.assign(new Error(`El PTI ${ptiProduct.code} salió de Extrusión con ruta directa (${routeLabel}). No se puede asignar a un telar.`), { statusCode: 409, code: 'PTI_DIRECT_ROUTE_BLOCKED' });
      }
      assertRackAuthorizedForTelares(rack, ptiProduct);
      const expectedPtiSubareaId = await this.resolvePtiSubareaId(ptiProduct, t);
      if (rack.destination_route && rack.destination_route !== getExpectedPtiTelaresRoute(ptiProduct)) {
        throw Object.assign(new Error(`El PTI ${ptiProduct.code} está asignado a ${rack.destination_route}, no a la ruta de este telar.`), { statusCode: 409, code: 'PTI_TELARES_ROUTE_MISMATCH' });
      }
      const destinationSubareaId = rack.destination_subarea_id || expectedPtiSubareaId;
      if (Number(destinationSubareaId) !== Number(expectedPtiSubareaId)) {
        throw Object.assign(new Error(`El PTI ${ptiProduct.code} tiene destino fijo a ${getExpectedPtiTelaresRoute(ptiProduct) === 'TELARES_BANDA' ? 'Telares Banda' : 'Telares Rollo'}.`), { statusCode: 409 });
      }
      if (Number(destinationSubareaId || 0) !== Number(loom.subarea_id || 0)) {
        const destination = destinationSubareaId ? 'TELARES BANDA' : 'TELARES';
        throw new Error(`El rack pertenece a ${destination} y no puede asignarse a ${loom.subarea?.name || (loom.subarea_id ? 'la subárea del telar' : 'Telares general')}.`);
      }
      const supportedTypes = Array.isArray(loom.supported_pti_types) ? loom.supported_pti_types.map(Number) : [];
      if (supportedTypes.length && !supportedTypes.includes(Number(ptiProduct.id))) {
        throw Object.assign(new Error(`El telar ${loom.name} no está configurado para manejar el PTI ${ptiProduct.code} (${ptiProduct.color || 'color no definido'}).`), { statusCode: 409 });
      }
      const activeRun = await LoomRun.findOne({ where: { loom_id: loom.id, status: 'EN_PROCESO' }, transaction: t });
      const bomIds = activeRun?.bom_id
        ? [Number(activeRun.bom_id)]
        : (loom.current_bom_id ? [Number(loom.current_bom_id)] : (Array.isArray(loom.supported_bom_ids) ? loom.supported_bom_ids.map(Number) : []));
      if (bomIds.length && !(await ProductionBomItem.findOne({ where: { bom_id: { [Op.in]: bomIds }, pti_product_id: ptiProduct.id }, transaction: t }))) {
        throw Object.assign(new Error(`El PTI ${ptiProduct.code} no forma parte de los modelos/fichas compatibles con ${loom.name}.`), { statusCode: 409 });
      }

      const updateData = {};
      const normalizedRole = role.toUpperCase();
      if (normalizedRole === 'URDIMBRE') {
        updateData.active_warp_rack_id = rack.id;
      } else if (normalizedRole === 'TRAMA') {
        updateData.active_weft_rack_id = rack.id;
      } else {
        updateData.active_warp_rack_id = rack.id;
        updateData.active_weft_rack_id = rack.id;
      }

      await loom.update(updateData, { transaction: t });

      if (activeRun) {
        if (normalizedRole === 'URDIMBRE') await activeRun.update({ warp_rack_id: rack.id }, { transaction: t });
        if (normalizedRole === 'TRAMA') await activeRun.update({ weft_rack_id: rack.id }, { transaction: t });
      }

      await t.commit();
      return {
        success: true,
        message: `Rack Maestro '${rack.rack_code}' asignado como ${normalizedRole} en ${loom.name}.`,
        loom_id: loom.id,
        rack_id: rack.id,
        current_quantity: rack.current_quantity,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Iniciar corrida de tejeduría en telar
   */
  async startLoomRun({ loom_id, bom_id, operator_id, shift, meters_planned, weight_planned_kg, notes }) {
    const t = await sequelize.transaction();
    try {
      const loom = await Loom.findByPk(loom_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!loom) throw new Error(`Telar ID ${loom_id} no encontrado.`);

      const existingRun = await LoomRun.findOne({
        where: { loom_id, status: 'EN_PROCESO' },
        transaction: t,
      });
      if (existingRun) {
        throw new Error(`El ${loom.name} ya tiene una corrida activa en proceso (${existingRun.folio}).`);
      }

      const bom = await ProductionBom.findByPk(bom_id, {
        include: [{ model: ProductionBomItem, as: 'items', include: [{ model: PtiProduct, as: 'ptiProduct' }] }],
        transaction: t,
      });
      if (!bom) throw new Error(`Receta / BOM ID ${bom_id} no encontrada.`);
      if (!bom.is_active || bom.is_provisional) {
        throw Object.assign(new Error(`La ficha ${bom.name} está inactiva o provisional; no se puede iniciar una corrida hasta confirmar sus datos de proceso.`), { statusCode: 409, code: 'BOM_NOT_PRODUCTION_READY' });
      }
      if (!loom.subarea_id || Number(bom.subarea_id || 0) !== Number(loom.subarea_id)) {
        throw Object.assign(new Error(`La ficha ${bom.name} pertenece a otra subárea. Verifica que la máquina y el PTI sean ambos de Rollo o ambos de Banda.`), { statusCode: 409, code: 'TELARES_SUBAREA_MISMATCH' });
      }
      let plannedMeters = Number(meters_planned || 0);
      const plannedWeightKg = Number(weight_planned_kg || 0);
      const estimatedKgPerMeter = estimateBomFabricWeightKg(bom, 1);
      if (plannedWeightKg > 0) {
        if (!estimatedKgPerMeter || estimatedKgPerMeter <= 0) throw Object.assign(new Error(`La ficha ${bom.name} no tiene ancho, onzas y factor de conversión, ni gramaje de referencia para convertir kg a metros.`), { statusCode: 409 });
        plannedMeters = plannedWeightKg / estimatedKgPerMeter;
      }
      if (!Number.isFinite(plannedMeters) || plannedMeters <= 0) throw Object.assign(new Error('Indica una meta válida de metros o peso.'), { statusCode: 400 });
      const supportedBoms = Array.isArray(loom.supported_bom_ids) ? loom.supported_bom_ids.map(Number) : [];
      if (supportedBoms.length && !supportedBoms.includes(Number(bom.id))) {
        throw new Error(`El telar ${loom.name} no está habilitado para producir ${bom.name}.`);
      }

      const availability = await this.assessLoomPtiAvailability({ loomId: loom.id, bom, plannedMeters, plannedWeightKg: plannedWeightKg > 0 ? plannedWeightKg : null, transaction: t });
      if (!availability.sufficient) {
        await this.notifyTelaresSupervisors({ loom, bom, plannedMeters: Number(plannedMeters.toFixed(2)), shortages: availability.shortages }, operator_id);
        const error = new Error(`WIP insuficiente para ${bom.name} en ${loom.name}. Se notificó al Supervisor de Telares con el faltante y los QRs sugeridos por FIFO.`);
        error.statusCode = 409;
        error.code = 'PTI_WIP_INSUFFICIENT';
        error.details = availability.shortages;
        throw error;
      }

      // Generar Folio único con fecha de CDMX (CST)
      const dateStr = getCdmxDateString().replace(/-/g, '');
      const count = await LoomRun.count({ transaction: t });
      const folio = `RUN-TEL-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

      const run = await LoomRun.create(
        {
          folio,
          loom_id,
          bom_id,
          operator_id: operator_id || null,
          shift: shift || getCdmxShift().shiftCode,
          status: 'EN_PROCESO',
          warp_rack_id: loom.active_warp_rack_id || null,
          weft_rack_id: loom.active_weft_rack_id || null,
          meters_planned: Number(plannedMeters.toFixed(2)),
          weight_planned_kg: plannedWeightKg > 0 ? Number(plannedWeightKg.toFixed(3)) : (estimateBomFabricWeightKg(bom, plannedMeters) ?? Number((plannedMeters * Number(bom.target_weight_g_per_m || 0) / 1000).toFixed(3))),
          meters_produced: 0.0,
          total_weight_produced_kg: 0.0,
          total_pti_consumed_kg: 0.0,
          rolls_produced_count: 0,
          started_at: new Date(),
          notes: notes || null,
        },
        { transaction: t }
      );

      await loom.update(
        {
          status: 'EN_PRODUCCION',
          current_bom_id: bom.id,
        },
        { transaction: t }
      );

      await t.commit();
      return run;
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Registrar producción de rollo de tela, generar QR Viajero con Enrutamiento y ejecutar BACKFLUSHING
   * Formato Estricto de Código (PDF Pág 2): [TELAR]-[TURNO]-[NUM_ROLLO]-[NOMINA] (Ej: 10-3-24-1200)
   * Manejo de Creel WIP (días sin consumo de racks vs días con consumo de creel o racks)
   */
  async finishRollAndBackflush({ run_id, meters, weight_kg, operator_id, recorded_by, shift_supervisor_id, operator_segments, custom_route, notes, shift_number, operator_nomina, idempotency_key, virgin_qr_code }) {
    const virginQrValue = String(virgin_qr_code || '').trim();
    if (!virginQrValue) throw Object.assign(new Error('Escanea un QR virgen solicitado a Almacén para identificar el rollo o banda terminada.'), { statusCode: 400, code: 'TELARES_OUTPUT_QR_REQUIRED' });
    const idempotencyKey = String(idempotency_key || '').trim();
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(idempotencyKey)) {
      throw Object.assign(new Error('No se pudo asegurar el registro contra envíos duplicados. Actualiza la pantalla y vuelve a intentarlo.'), { statusCode: 400, code: 'IDEMPOTENCY_KEY_REQUIRED' });
    }
    const requestFingerprint = JSON.stringify({
      run_id: Number(run_id), meters: Number(meters), weight_kg: Number(weight_kg),
      operator_id: Number(operator_id) || null, recorded_by: Number(recorded_by) || null,
      shift_supervisor_id: Number(shift_supervisor_id) || null,
      operator_segments: operator_segments || [], custom_route: custom_route || [],
      notes: String(notes || ''), shift_number: Number(shift_number) || null,
      operator_nomina: String(operator_nomina || ''),
      virgin_qr_code: virginQrValue,
    });
    const payloadHash = createHash('sha256').update(requestFingerprint).digest('hex');
    const t = await sequelize.transaction();
    try {
      await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:idempotencyKey))', {
        replacements: { idempotencyKey },
        transaction: t,
      });
      const priorRoll = await ViajeroRoll.findOne({ where: { idempotency_key: idempotencyKey }, transaction: t });
      if (priorRoll) {
        if (priorRoll.idempotency_payload_hash !== payloadHash) {
          throw Object.assign(new Error('Este intento ya se usó con datos distintos. Revisa el formulario y vuelve a enviar.'), { statusCode: 409, code: 'IDEMPOTENCY_KEY_REUSED' });
        }
        const [priorBackflush, priorRun] = await Promise.all([
          LoomBackflushConsumption.findAll({ where: { viajero_roll_id: priorRoll.id }, order: [['id', 'ASC']], transaction: t }),
          LoomRun.findByPk(priorRoll.run_id, { transaction: t }),
        ]);
        await t.commit();
        return {
          success: true,
          idempotent_replay: true,
          roll: priorRoll,
          backflush: priorBackflush,
          run_summary: {
            folio: priorRun?.folio || null,
            meters_produced: Number(priorRun?.meters_produced || 0),
            rolls_count: Number(priorRun?.rolls_produced_count || 0),
            roll_code: priorRoll.roll_code,
            calculated_roll_cost: priorRoll.cost_data_complete ? priorRoll.calculated_roll_cost : null,
          },
        };
      }
      const runIdNum = Number(run_id);
      if (!runIdNum || isNaN(runIdNum)) {
        throw new Error('Se requiere un ID de corrida de telar válido (run_id).');
      }

      const run = await LoomRun.findByPk(runIdNum, {
        include: [
          { model: Loom, as: 'loom' },
          {
            model: ProductionBom,
            as: 'bom',
            include: [{ model: ProductionBomItem, as: 'items', include: ['ptiProduct'] }],
          },
        ],
        transaction: t,
        lock: { level: t.LOCK.UPDATE, of: LoomRun },
      });

      if (!run) throw new Error(`Corrida ID ${run_id} no encontrada.`);
      if (run.status !== 'EN_PROCESO') throw new Error(`La corrida ${run.folio} no se encuentra en estado EN_PROCESO.`);

      const qrArea = await Area.findOne({ where: { code: 'TELARES' }, transaction: t });
      if (!qrArea) throw Object.assign(new Error('No está configurada el área Telares para validar sus etiquetas.'), { statusCode: 409 });
      const outputQr = await QrCode.findOne({ where: { qr_code: virginQrValue }, transaction: t, lock: t.LOCK.UPDATE });
      if (!outputQr || !outputQr.is_active) throw Object.assign(new Error('El QR no existe o está inactivo. Solicita un lote vigente a Almacén.'), { statusCode: 409, code: 'TELARES_OUTPUT_QR_INVALID' });
      if (Number(outputQr.assigned_area_id) !== Number(qrArea.id)) throw Object.assign(new Error('Este QR no está asignado a Telares. Escanea una etiqueta virgen del lote solicitado para esta área.'), { statusCode: 409, code: 'TELARES_OUTPUT_QR_WRONG_AREA' });
      const qrStatus = String(outputQr.status || '').toUpperCase();
      if (!['UNASSIGNED', 'ASSIGNED'].includes(qrStatus) || outputQr.entity_type || outputQr.entity_id || ['IN_USE', 'CONSUMED', 'CANCELADO', 'DANADO'].includes(qrStatus)) {
        throw Object.assign(new Error('Este QR ya fue usado, cancelado o asignado a otro registro.'), { statusCode: 409, code: 'TELARES_OUTPUT_QR_ALREADY_USED' });
      }
      const existingQrItem = await TraceableItem.findOne({ where: { qr_code_id: outputQr.id }, transaction: t, lock: t.LOCK.UPDATE });
      if (existingQrItem) throw Object.assign(new Error('Este QR ya tiene un elemento de trazabilidad asociado.'), { statusCode: 409, code: 'TELARES_OUTPUT_QR_ALREADY_USED' });

      const outputMeasures = validateOutputMeasures(meters, weight_kg);
      const numMeters = outputMeasures.meters;
      const numWeightKg = outputMeasures.weight_kg;

      const supervisorId = Number(shift_supervisor_id);
      if (!Number.isInteger(supervisorId) || supervisorId <= 0) {
        throw Object.assign(new Error('Selecciona al supervisor responsable del turno antes de cerrar el rollo.'), { statusCode: 400 });
      }
      const supervisor = await User.findByPk(supervisorId, {
        include: [{ model: Role, as: 'role', include: [{ model: Area, as: 'area' }] }],
        transaction: t,
      });
      if (!supervisor?.is_active || !isSupervisor(supervisor) || getUserAreaCode(supervisor) !== 'TELARES') {
        throw Object.assign(new Error('El supervisor seleccionado debe estar activo y pertenecer a Telares.'), { statusCode: 400 });
      }
      if (!Array.isArray(operator_segments) || operator_segments.length === 0) {
        throw Object.assign(new Error('Registra al menos un operador y el tramo de metros que intervino en este rollo.'), { statusCode: 400 });
      }
      const normalizedSegments = operator_segments.map((segment, index) => {
        const segmentOperatorId = Number(segment.operator_id);
        const segmentShift = Number(segment.shift_number);
        const metersStart = Number(segment.meters_start);
        const metersEnd = Number(segment.meters_end);
        const weightStart = segment.weight_start_kg == null || segment.weight_start_kg === '' ? null : Number(segment.weight_start_kg);
        const weightEnd = segment.weight_end_kg == null || segment.weight_end_kg === '' ? null : Number(segment.weight_end_kg);
        if (!Number.isInteger(segmentOperatorId) || segmentOperatorId <= 0) throw Object.assign(new Error(`Selecciona un operador válido para el tramo ${index + 1}.`), { statusCode: 400 });
        if (!Number.isInteger(segmentShift) || segmentShift < 1 || segmentShift > 3) throw Object.assign(new Error(`Selecciona un turno válido para el tramo ${index + 1}.`), { statusCode: 400 });
        if (!Number.isFinite(metersStart) || !Number.isFinite(metersEnd) || metersStart < 0 || metersEnd <= metersStart || metersEnd > numMeters) {
          throw Object.assign(new Error(`El tramo ${index + 1} debe estar dentro de 0 y ${numMeters} metros, con inicio menor al fin.`), { statusCode: 400 });
        }
        if ((weightStart == null) !== (weightEnd == null)
          || (weightStart != null && (!Number.isFinite(weightStart) || !Number.isFinite(weightEnd) || weightStart < 0 || weightEnd <= weightStart || weightEnd > numWeightKg))) {
          throw Object.assign(new Error(`El rango de peso del tramo ${index + 1} debe ser válido y quedar dentro de 0 y ${numWeightKg} kg.`), { statusCode: 400 });
        }
        return {
          operator_id: segmentOperatorId,
          shift_number: segmentShift,
          meters_start: metersStart,
          meters_end: metersEnd,
          weight_start_kg: weightStart,
          weight_end_kg: weightEnd,
          notes: String(segment.notes || '').trim() || null,
        };
      });
      validateOperatorMeterCoverage(normalizedSegments, numMeters);
      validateOperatorWeightCoverage(normalizedSegments, numWeightKg);
      const operatorUsers = await User.findAll({
        where: { id: [...new Set(normalizedSegments.map((segment) => segment.operator_id))] },
        include: [{ model: Role, as: 'role', include: [{ model: Area, as: 'area' }] }],
        transaction: t,
      });
      for (const segment of normalizedSegments) {
        const person = operatorUsers.find((candidate) => Number(candidate.id) === segment.operator_id);
        if (!person?.is_active || isSupervisor(person) || getUserAreaCode(person) !== 'TELARES') {
          throw Object.assign(new Error('Cada tramo debe asignarse a un operador activo de Telares.'), { statusCode: 400 });
        }
      }
      const primaryOperator = operatorUsers.find((person) => Number(person.id) === normalizedSegments[0].operator_id);

      const bom = run.bom;
      const availability = await this.assessLoomPtiAvailability({ loomId: run.loom_id, bom, plannedMeters: numMeters, plannedWeightKg: numWeightKg, transaction: t });
      if (!availability.sufficient) {
        const error = new Error(`WIP insuficiente para registrar ${numMeters} m del rollo ${bom.output_product_name || bom.name}. Se notificará al Supervisor de Telares con el faltante y los QRs FIFO.`);
        error.statusCode = 409;
        error.code = 'PTI_WIP_INSUFFICIENT';
        error.shortageNotification = { loom: run.loom, bom, plannedMeters: numMeters, shortages: availability.shortages };
        error.details = availability.shortages;
        throw error;
      }
      const widthCm = Number(bom.target_width_cm || 50.0);
      const grammage = (numWeightKg * 1000) / numMeters;

      // 1. Determinar Ruta Oficial del QR Viajero
      const bomProductKind = String(bom.product_kind || 'ROLLO_TELA').trim().toUpperCase();
      const officialRoute = this.normalizeProductionRoute(
        custom_route,
        bomProductKind
      );
      const configuredRoutes = Array.isArray(bom.allowed_routes) && bom.allowed_routes.length
        ? bom.allowed_routes
        : [bom.default_route];
      const routeKey = (route) => JSON.stringify(route.map((stage) => String(stage).toUpperCase()));
      if (!configuredRoutes.some((configuredRoute) => routeKey(this.normalizeProductionRoute(configuredRoute, bomProductKind)) === routeKey(officialRoute))) {
        throw Object.assign(new Error('La ruta elegida no está autorizada en el catálogo para este PTI. Selecciona una de las rutas de su ficha técnica.'), { statusCode: 400, code: 'PRODUCTION_ROUTE_NOT_ALLOWED' });
      }
      const corteManagedRoutes = configuredRoutes
        .map((configuredRoute) => this.normalizeProductionRoute(configuredRoute, bomProductKind))
        .filter((configuredRoute) => bomProductKind === 'ROLLO_TELA' && configuredRoute.includes('LAMINADO'));
      if (corteManagedRoutes.length) {
        const canonicalCorteRoute = corteManagedRoutes.find((candidate) => candidate.includes('CORTE')) || corteManagedRoutes[0];
        if (routeKey(officialRoute) !== routeKey(canonicalCorteRoute)) {
          throw Object.assign(new Error('La ruta de este rollo con opción de Laminado la determina la ficha técnica. Corte decide después si solicita el rollo; Telares no debe elegir otra ruta.'), { statusCode: 409, code: 'CORTE_MANAGED_LAMINATION_ROUTE' });
        }
      }
      const currentStage = 'TELARES';
      const nextAllowedStage = officialRoute[1];

      // 2. CODIFICACIÓN ESTRICTA DEL ROLLO (PDF PÁGINA 2):
      // [NÚMERO DE TELAR]-[TURNO DE TRABAJO]-[NÚMERO DE ROLLO]-[NÚMERO DE NÓMINA] (Ej: 10-3-24-1200)
      const loomNumber = run.loom.loom_number || parseInt(run.loom.code.replace(/\D/g, ''), 10) || run.loom.id;

      let shiftNum = 1;
      if (shift_number) {
        shiftNum = Number(shift_number);
      } else if (run.shift) {
        if (run.shift.includes('2')) shiftNum = 2;
        else if (run.shift.includes('3')) shiftNum = 3;
        else shiftNum = 1;
      } else {
        shiftNum = getCdmxShift().shiftNumber;
      }

      // Consecutivo histórico de rollos fabricados por este telar
      const previousRollsOnLoom = await ViajeroRoll.count({
        where: { loom_id: run.loom_id },
        transaction: t,
      });
      const rollSeq = Math.max(Number(run.loom.total_rolls_produced || 0), previousRollsOnLoom) + 1;

      // Número de nómina del operador de turno
      const opNomina = String(primaryOperator?.numero_nomina || '').trim();
      if (!opNomina) {
        throw Object.assign(new Error('El operador principal no tiene número de nómina registrado. Completa su perfil antes de generar el QR viajero.'), { statusCode: 400, code: 'OPERATOR_PAYROLL_REQUIRED' });
      }

      // Construcción del código exacto
      let rollCode = `${loomNumber}-${shiftNum}-${rollSeq}-${opNomina}`;
      let collision = 0;
      let finalRollSequence = rollSeq;
      while (await ViajeroRoll.findOne({ where: { roll_code: rollCode }, transaction: t })) {
        collision++;
        finalRollSequence = rollSeq + collision;
        rollCode = `${loomNumber}-${shiftNum}-${finalRollSequence}-${opNomina}`;
      }
      const qrCode = virginQrValue;

      // 3. Cálculo de Transformación de Costo (Editable en el BOM)
      const costTransformationIndex = Number(bom.cost_transformation_index || 1.0000);
      let totalBasePtiCost = 0;
      let costDataComplete = true;
      let calculatedRollCost = 0;

      // 4. Crear Registro de Rollo con QR Viajero
      const now = new Date();
      const initialHistory = [
        {
          stage: 'TELARES',
          action: 'PRODUCIDO',
          loom_code: run.loom.code,
          loom_number: loomNumber,
          shift_number: shiftNum,
          roll_sequence: finalRollSequence,
          operator_nomina: opNomina,
          meters: numMeters,
          weight_kg: numWeightKg,
          calculated_roll_cost: null,
          cost_data_complete: false,
          cost_transformation_index: costTransformationIndex,
          timestamp: now.toISOString(),
          operator_id,
        },
      ];

      const viajeroRoll = await ViajeroRoll.create(
        {
          qr_code: qrCode,
          virgin_qr_code_id: outputQr.id,
          roll_code: rollCode,
          idempotency_key: idempotencyKey,
          idempotency_payload_hash: payloadHash,
          run_id: run.id,
          loom_id: run.loom_id,
          bom_id: bom.id,
          operator_id: operator_id || run.operator_id,
          shift_supervisor_id: supervisorId,
          meters: numMeters,
          weight_kg: numWeightKg,
          width_cm: widthCm,
          grammage_g_per_m: grammage,
          route: officialRoute,
          current_stage: currentStage,
          next_allowed_stage: nextAllowedStage,
          stages_history: initialHistory,
          status: 'DISPONIBLE',
          is_active: true,
          loom_number: loomNumber,
          shift_number: shiftNum,
          roll_sequence: finalRollSequence,
          operator_nomina: opNomina,
          cost_transformation_index: costTransformationIndex,
          calculated_roll_cost: 0,
          ounces_yd2: bom.ounces_yd2,
          fabric_type: bom.fabric_type,
          tape_color: bom.tape_color,
          product_kind: bom.product_kind || 'ROLLO_TELA',
          output_product_name: bom.output_product_name || bom.name,
          output_color: bom.output_color,
          output_width_value: bom.output_width_value,
          output_width_unit: bom.output_width_unit,
          output_denier: bom.output_denier,
          tensile_strength_lb: bom.tensile_strength_lb,
          units_per_pallet: bom.units_per_pallet,
          packaging_type: bom.packaging_type,
        },
        { transaction: t }
      );

      await outputQr.update({
        purpose: 'TELARES_ROLL',
        status: 'IN_USE',
        current_area_id: qrArea.id,
        entity_type: 'VIAJERO_ROLL',
        entity_id: viajeroRoll.id,
        used_by: recorded_by || operator_id || null,
        used_at: now,
      }, { transaction: t });
      await TraceableItem.create({
        qr_code_id: outputQr.id,
        item_type: 'FINISHED_PRODUCT',
        product_name: bom.output_product_name || bom.name,
        origin_area_id: qrArea.id,
        current_area_id: qrArea.id,
        quantity_initial: numWeightKg,
        quantity_current: numWeightKg,
        unit: 'KG',
        status: 'DISPONIBLE',
        reference_folio: rollCode,
        location: run.loom?.name || null,
        metadata: { roll_code: rollCode, bom_code: bom.code, bom_id: bom.id, meters: numMeters, weight_kg: numWeightKg, route: officialRoute, loom_id: run.loom_id, shift_number: shiftNum },
        created_by: recorded_by || operator_id || null,
        updated_by: recorded_by || operator_id || null,
      }, { transaction: t });
      await TraceabilityEvent.create({
        qr_code_id: outputQr.id,
        entity_type: 'VIAJERO_ROLL',
        entity_id: String(viajeroRoll.id),
        event_type: 'FINALIZED',
        from_status: qrStatus,
        to_status: 'IN_USE',
        from_area_id: outputQr.assigned_area_id || null,
        to_area_id: qrArea.id,
        performed_by: recorded_by || operator_id,
        notes: `QR virgen asignado al producto de Telares ${rollCode}.`,
        metadata: { roll_code: rollCode, bom_code: bom.code, meters: numMeters, weight_kg: numWeightKg, route: officialRoute, loom_id: run.loom_id, run_id: run.id },
      }, { transaction: t });

      await ViajeroRollOperatorSegment.bulkCreate(normalizedSegments.map((segment) => ({
        viajero_roll_id: viajeroRoll.id,
        ...segment,
        recorded_by: recorded_by || null,
      })), { transaction: t });

      // 5. Consumir FIFO exclusivamente del WIP ya recibido por este telar.
      let totalPtiDeductedKg = 0;
      let totalSpoolsConsumed = 0;
      let totalWeightConsumed = 0;
      const backflushRecords = [];
      const currentCreelSpools = Number(run.loom.current_spools_count || 0);
      const currentCreelKg = Number(run.loom.current_wip_kg || 0);
      const requiredByProduct = this.calculateBomPtiDemand(bom, numMeters, numWeightKg);
      const trackedLoomWip = await LoomPtiWip.findAll({
        where: { loom_id: run.loom_id, pti_product_id: { [Op.in]: requiredByProduct.map(({ item }) => Number(item.pti_product_id)) }, quantity_remaining_spools: { [Op.gt]: 0 } },
        order: [['received_at', 'ASC'], ['id', 'ASC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      for (const demand of requiredByProduct) {
        const { item } = demand;
        const productRows = trackedLoomWip.filter((row) => Number(row.pti_product_id) === Number(item.pti_product_id) && Number(row.quantity_remaining_spools) > 0);
        const availablePieces = productRows.reduce((sum, row) => sum + Number(row.quantity_remaining_spools), 0);
        const availableKg = productRows.reduce((sum, row) => sum + Number(row.quantity_remaining_spools) * Number(row.unit_weight_kg), 0);
        const averageUnitWeight = availablePieces > 0 ? availableKg / availablePieces : 0;
        if (averageUnitWeight <= 0) throw Object.assign(new Error(`No hay peso unitario trazable en el WIP de ${item.ptiProduct?.code || item.pti_product_id}.`), { statusCode: 409 });
        const piecesToConsume = Number((demand.requiredSpools ?? Number(demand.requiredKg || 0) / averageUnitWeight).toFixed(3));
        const theoreticalKg = Number((demand.requiredKg ?? piecesToConsume * averageUnitWeight).toFixed(3));
        if (piecesToConsume > availablePieces + 0.001) {
          throw Object.assign(new Error(`WIP insuficiente para ${item.ptiProduct?.code || item.pti_product_id} en ${run.loom.name}: requiere ${piecesToConsume.toFixed(2)} bobinas y hay ${availablePieces.toFixed(2)}.`), { statusCode: 409 });
        }

        let piecesRemaining = piecesToConsume;
        for (const wipRow of productRows) {
          if (piecesRemaining <= 0.0001) break;
          if (!wipRow.source_rack_id) throw Object.assign(new Error(`El WIP de ${item.ptiProduct?.code || item.pti_product_id} carece de rack origen. Se requiere completar la trazabilidad antes de consumirlo.`), { statusCode: 409 });
          const balanceBefore = Number(wipRow.quantity_remaining_spools);
          const consumedPieces = Number(Math.min(balanceBefore, piecesRemaining).toFixed(3));
          const balanceAfter = Number((balanceBefore - consumedPieces).toFixed(3));
          // Keep all product precision in the backflush ledger. The aggregate
          // loom balance is rounded only once after summing the remaining FIFO
          // rows, otherwise per-row 3-decimal rounding creates cumulative drift.
          const consumedKg = Number((consumedPieces * Number(wipRow.unit_weight_kg)).toFixed(6));
          const unitCost = wipRow.unit_cost_per_kg == null ? null : Number(wipRow.unit_cost_per_kg);
          const materialCost = unitCost == null ? null : Number((consumedKg * unitCost).toFixed(4));
          const transformedCost = materialCost == null ? null : Number((materialCost * costTransformationIndex).toFixed(4));
          if (materialCost == null) costDataComplete = false;
          else totalBasePtiCost += materialCost;

          wipRow.quantity_remaining_spools = balanceAfter;
          await wipRow.save({ transaction: t });
          const consumptionEntry = await LoomBackflushConsumption.create({
            viajero_roll_id: viajeroRoll.id,
            loom_run_id: run.id,
            rack_id: wipRow.source_rack_id,
            source_loom_wip_item_id: wipRow.id,
            pti_product_id: item.pti_product_id,
            role: item.role,
            theoretical_kg: consumedKg,
            spools_consumed: consumedPieces,
            rack_balance_spools_before: balanceBefore,
            rack_balance_spools_after: balanceAfter,
            unit_cost_per_kg_snapshot: unitCost,
            material_cost_mxn: materialCost,
            transformation_index_snapshot: costTransformationIndex,
            transformed_cost_mxn: transformedCost,
          }, { transaction: t });
          backflushRecords.push(consumptionEntry);
          piecesRemaining = Number((piecesRemaining - consumedPieces).toFixed(3));
          totalSpoolsConsumed += consumedPieces;
          totalWeightConsumed += consumedKg;
          totalPtiDeductedKg += consumedKg;
        }
        if (piecesRemaining > 0.001) throw Object.assign(new Error(`La trazabilidad FIFO de ${item.ptiProduct?.code || item.pti_product_id} no cubre el consumo requerido.`), { statusCode: 409 });
        if (Math.abs(theoreticalKg - (demand.requiredKg ?? theoreticalKg)) > 0.02) {
          throw Object.assign(new Error(`La equivalencia peso/bobinas de ${item.ptiProduct?.code || item.pti_product_id} requiere conciliación.`), { statusCode: 409 });
        }
      }

      if (currentCreelSpools + 0.001 < totalSpoolsConsumed || currentCreelKg + 0.001 < totalWeightConsumed) {
        throw Object.assign(new Error(`El saldo agregado de ${run.loom.name} no concuerda con su desglose por PTI. Requiere conciliación antes de registrar producción.`), { statusCode: 409 });
      }
      const remainingWipKg = trackedLoomWip.reduce(
        (sum, row) => sum + Number(row.quantity_remaining_spools || 0) * Number(row.unit_weight_kg || 0),
        0,
      );
      await run.loom.update({
        current_spools_count: Number(Math.max(0, currentCreelSpools - totalSpoolsConsumed).toFixed(3)),
        current_wip_kg: Number(Math.max(0, remainingWipKg).toFixed(3)),
        total_rolls_produced: finalRollSequence,
      }, { transaction: t });

      calculatedRollCost = costDataComplete ? Number((totalBasePtiCost * costTransformationIndex).toFixed(4)) : 0;
      const updatedProductionHistory = [...initialHistory];
      updatedProductionHistory[0] = {
        ...updatedProductionHistory[0],
        material_cost_mxn: costDataComplete ? Number(totalBasePtiCost.toFixed(4)) : null,
        calculated_roll_cost: costDataComplete ? calculatedRollCost : null,
        cost_data_complete: costDataComplete,
        cost_transformation_index: costTransformationIndex,
      };
      await viajeroRoll.update({
        calculated_roll_cost: costDataComplete ? calculatedRollCost : null,
        cost_data_complete: costDataComplete,
        stages_history: updatedProductionHistory,
      }, { transaction: t });

      // 6. Actualizar Acumulados de la Corrida
      const updatedMeters = Number(run.meters_produced) + numMeters;
      const updatedWeight = Number(run.total_weight_produced_kg) + numWeightKg;
      const updatedPtiConsumed = Number((Number(run.total_pti_consumed_kg) + totalPtiDeductedKg).toFixed(3));
      const updatedRollsCount = run.rolls_produced_count + 1;

      await run.update(
        {
          meters_produced: updatedMeters,
          total_weight_produced_kg: updatedWeight,
          total_pti_consumed_kg: updatedPtiConsumed,
          rolls_produced_count: updatedRollsCount,
        },
        { transaction: t }
      );

      // 7. Registrar en Kardex de Enrutamiento
      await ViajeroRoutingLog.create(
        {
          viajero_roll_id: viajeroRoll.id,
          from_stage: 'NONE',
          to_stage: 'TELARES',
          area_id: 3,
          operator_id: operator_id || run.operator_id,
          action: 'INGRESO_AREA',
          meters_in: 0,
          meters_out: numMeters,
          weight_in_kg: 0,
          weight_out_kg: numWeightKg,
          notes: notes || `Rollo producido en Telar #${loomNumber} por operador ${opNomina}`,
        },
        { transaction: t }
      );

      await viajeroRoll.reload({
        transaction: t,
        include: [
          { model: User, as: 'shiftSupervisor', attributes: ['id', 'first_name', 'last_name', 'username', 'numero_nomina'] },
          { model: ViajeroRollOperatorSegment, as: 'operatorSegments', include: [{ model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username', 'numero_nomina'] }] },
        ],
      });

      await t.commit();

      // En Telares solo se notifica al supervisor de Laminado cuando la salida sea ROLLO_TELA.
      if (bomProductKind === 'ROLLO_TELA' && nextAllowedStage === 'LAMINADO') {
        try {
          const targetRoleName = `SUPERVISOR_${nextAllowedStage}`;
          const targetRole = await Role.findOne({ where: { code: targetRoleName } });
          const adminRole = await Role.findOne({ where: { code: `ADMIN_${nextAllowedStage}` } });
          const roleIds = [targetRole?.id, adminRole?.id].filter(Boolean);
          if (roleIds.length > 0) {
            const supervisors = await User.findAll({ where: { role_id: { [Op.in]: roleIds }, is_active: true } });
            for (const sup of supervisors) {
              await Notification.create({
                recipient_id: sup.id,
                sender_id: operator_id || run.operator_id,
                type: 'INFO',
                title: `Nuevo Rollo Asignado a ${nextAllowedStage}`,
                message: `El Telar #${loomNumber} ha producido el Rollo ${rollCode} (${numMeters} m, ${numWeightKg} kg) con destino a ${nextAllowedStage}. Prepara los materiales en tu WIP.`,
              });
            }
          }
        } catch (notifErr) {
          console.error('[TELARES] Error notificando a supervisor de área destino:', notifErr.message);
        }
      }

      return {
        success: true,
        roll: viajeroRoll,
        backflush: backflushRecords,
        run_summary: {
          folio: run.folio,
          meters_produced: updatedMeters,
          rolls_count: updatedRollsCount,
          roll_code: rollCode,
          calculated_roll_cost: costDataComplete ? calculatedRollCost : null,
        },
      };
    } catch (err) {
      await t.rollback();
      if (err.shortageNotification) {
        try {
          await this.notifyTelaresSupervisors(err.shortageNotification, operator_id);
        } catch (notificationError) {
          console.error('[TELARES] No se pudo notificar faltante de PTI:', notificationError.message);
        }
      }
      throw err;
    }
  }

  /**
   * Finalizar / cerrar una corrida activa de telar (permite liberar el telar o cambiar de BOM/ficha)
   */
  async finishLoomRun({ run_id, operator_id, notes }) {
    const t = await sequelize.transaction();
    try {
      const runIdNum = Number(run_id);
      if (!Number.isInteger(runIdNum) || runIdNum <= 0) {
        throw Object.assign(new Error('Se requiere un ID válido de corrida para finalizarla.'), { statusCode: 400 });
      }
      const run = await LoomRun.findByPk(runIdNum, {
        include: [{ model: Loom, as: 'loom' }, { model: ProductionBom, as: 'bom' }],
        transaction: t,
        lock: { level: t.LOCK.UPDATE, of: LoomRun },
      });
      if (!run) {
        throw Object.assign(new Error(`Corrida ID ${run_id} no encontrada.`), { statusCode: 404 });
      }
      if (run.status !== 'EN_PROCESO') {
        throw Object.assign(new Error(`La corrida ${run.folio} ya se encuentra en estado ${run.status}.`), { statusCode: 409 });
      }

      const loom = await Loom.findByPk(run.loom_id, { transaction: t, lock: t.LOCK.UPDATE });
      const cleanNotes = String(notes || '').trim();
      const updatedNotes = cleanNotes
        ? [run.notes, `[Cierre: ${cleanNotes}]`].filter(Boolean).join(' · ')
        : run.notes;

      await run.update(
        {
          status: 'FINALIZADA',
          finished_at: new Date(),
          notes: updatedNotes,
        },
        { transaction: t }
      );

      if (loom) {
        await loom.update(
          {
            status: 'DISPONIBLE',
          },
          { transaction: t }
        );
      }

      await t.commit();
      return {
        success: true,
        message: `Corrida ${run.folio} finalizada en ${loom?.name || `Telar #${run.loom_id}`}. El telar queda DISPONIBLE conservando su WIP en fileta.`,
        run: {
          id: run.id,
          folio: run.folio,
          loom_id: run.loom_id,
          bom_id: run.bom_id,
          status: 'FINALIZADA',
          meters_planned: Number(run.meters_planned || 0),
          meters_produced: Number(run.meters_produced || 0),
          total_weight_produced_kg: Number(run.total_weight_produced_kg || 0),
          rolls_produced_count: Number(run.rolls_produced_count || 0),
          finished_at: run.finished_at,
        },
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Consultar historial reciente de rollos / salidas de Telares (ViajeroRoll)
   */
  async getRecentViajeroRolls({ loom_id, shift_number, product_kind, status, search, limit = 30 } = {}, currentUser = null) {
    const allowCosts = canViewCosts(currentUser);
    const where = { is_active: true };
    if (loom_id && Number(loom_id) > 0) where.loom_id = Number(loom_id);
    if (shift_number && Number(shift_number) > 0) where.shift_number = Number(shift_number);
    if (product_kind) where.product_kind = String(product_kind).trim().toUpperCase();
    if (status) where.status = String(status).trim().toUpperCase();
    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = [
        { roll_code: { [Op.iLike]: term } },
        { qr_code: { [Op.iLike]: term } },
        { output_product_name: { [Op.iLike]: term } },
        { operator_nomina: { [Op.iLike]: term } },
      ];
    }

    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
    const rolls = await ViajeroRoll.findAll({
      where,
      include: [
        { model: Loom, as: 'loom', include: [{ model: Subarea, as: 'subarea', attributes: ['id', 'name', 'nomenclature'] }] },
        { model: ProductionBom, as: 'bom' },
        { model: LoomRun, as: 'run', attributes: ['id', 'folio', 'shift', 'status'] },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username', 'numero_nomina'] },
        { model: User, as: 'shiftSupervisor', attributes: ['id', 'first_name', 'last_name', 'username', 'numero_nomina'] },
        {
          model: ViajeroRollOperatorSegment,
          as: 'operatorSegments',
          include: [{ model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username', 'numero_nomina'] }],
        },
      ],
      order: [['created_at', 'DESC'], ['id', 'DESC']],
      limit: safeLimit,
    });

    return rolls.map((roll) => {
      const plain = roll.toJSON();
      if (!allowCosts) {
        delete plain.calculated_roll_cost;
        delete plain.cost_transformation_index;
        delete plain.cost_data_complete;
        if (plain.bom) delete plain.bom.cost_transformation_index;
      }
      return plain;
    });
  }

  async getScrapLogs({ loom_id, logged_date, from_date, to_date, shift_number, limit = 100 } = {}) {
    const where = {};
    if (loom_id && Number(loom_id) > 0) where.loom_id = Number(loom_id);
    if (shift_number && Number(shift_number) >= 1) where.shift_number = Number(shift_number);
    if (logged_date) where.logged_date = String(logged_date);
    else if (from_date || to_date) {
      where.logged_date = {};
      if (from_date) where.logged_date[Op.gte] = String(from_date);
      if (to_date) where.logged_date[Op.lte] = String(to_date);
    }
    return TelaresScrapLog.findAll({
      where,
      include: [
        { model: Loom, as: 'loom', attributes: ['id', 'code', 'name', 'loom_number', 'subarea_id'] },
        { model: User, as: 'recorder', attributes: ['id', 'first_name', 'last_name', 'username'] },
        { model: User, as: 'updater', attributes: ['id', 'first_name', 'last_name', 'username'] },
      ],
      order: [['logged_date', 'DESC'], ['shift_number', 'ASC'], [{ model: Loom, as: 'loom' }, 'loom_number', 'ASC']],
      limit: Math.min(300, Math.max(1, Number(limit) || 100)),
    });
  }

  async saveScrapLog(payload, userId, id = null) {
    const loomId = Number(payload.loom_id);
    const workDate = String(payload.logged_date || '').trim();
    const shiftNumber = Number(payload.shift_number);
    const weightKg = Number(payload.scrap_weight_kg);
    if (!Number.isInteger(loomId) || loomId <= 0) throw Object.assign(new Error('Selecciona un telar.'), { statusCode: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate) || Number.isNaN(Date.parse(`${workDate}T00:00:00Z`))) {
      throw Object.assign(new Error('Indica una fecha válida.'), { statusCode: 400 });
    }
    if (!Number.isInteger(shiftNumber) || shiftNumber < 1 || shiftNumber > 3) {
      throw Object.assign(new Error('Selecciona un turno válido (1, 2 o 3).'), { statusCode: 400 });
    }
    if (!Number.isFinite(weightKg) || weightKg < 0) throw Object.assign(new Error('El peso debe ser cero o mayor y expresarse en kg.'), { statusCode: 400 });
    const loom = await Loom.findByPk(loomId);
    if (!loom) throw Object.assign(new Error('El telar seleccionado no existe.'), { statusCode: 404 });
    const values = {
      loom_id: loomId,
      logged_date: workDate,
      shift_number: shiftNumber,
      scrap_weight_kg: Number(weightKg.toFixed(3)),
      notes: String(payload.notes || '').trim() || null,
    };
    try {
      if (id) {
        const log = await TelaresScrapLog.findByPk(id);
        if (!log) throw Object.assign(new Error('El registro de merma/scrap ya no existe.'), { statusCode: 404 });
        await log.update({ ...values, updated_by: userId || null });
        return log.reload({ include: [{ model: Loom, as: 'loom', attributes: ['id', 'code', 'name', 'loom_number', 'subarea_id'] }] });
      }
      return await TelaresScrapLog.create({ ...values, recorded_by: userId || null });
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw Object.assign(new Error('Ya existe un peso registrado para ese telar, fecha y turno. Abre ese registro para corregirlo.'), { statusCode: 409, code: 'TELARES_SCRAP_LOG_DUPLICATE' });
      }
      throw error;
    }
  }

  /**
   * Validar escaneo de QR Viajero en estaciones
   */
  async validateViajeroScan({ qr_code, area_name, operator_id }, transaction = null) {
    const clean = normalizeViajeroQr(qr_code);
    const targetArea = normalizeStageName(area_name);
    if (!targetArea) {
      return {
        is_allowed: false,
        error_code: 'AREA_REQUIRED',
        message: 'Indica el área destino para validar el ruteo del rollo.',
      };
    }
    const roll = await ViajeroRoll.findOne({
      where: {
        [Op.or]: [
          { qr_code: clean },
          { roll_code: clean },
          { qr_code: `VIAJERO-${clean}` },
          { roll_code: clean.replace(/^VIAJERO-/, '') },
        ],
        is_active: true,
      },
      include: [
        { model: Loom, as: 'loom' },
        { model: ProductionBom, as: 'bom' },
      ],
      ...(transaction ? {
        transaction,
        lock: { level: transaction.LOCK.UPDATE, of: ViajeroRoll },
      } : {}),
    });

    if (!roll) {
      return {
        is_allowed: false,
        error_code: 'ROLL_NOT_FOUND',
        message: `El código QR '${qr_code}' no corresponde a ningún Rollo Viajero registrado.`,
      };
    }

    const rawRoute = roll.route || [];
    const productKind = String(roll.product_kind || roll.bom?.product_kind || 'ROLLO_TELA').trim().toUpperCase();
    let route;

    try {
      route = this.normalizeProductionRoute(rawRoute, productKind);
    } catch (routeError) {
      return {
        is_allowed: false,
        error_code: routeError.code || 'INVALID_ROLL_ROUTE',
        roll: { roll_code: roll.roll_code, qr_code: roll.qr_code, route: rawRoute, current_stage: roll.current_stage, next_allowed_stage: roll.next_allowed_stage },
        message: `⛔ La ruta registrada para ${roll.roll_code} no es válida: ${routeError.message} Solicita corregirla antes de continuar.`,
      };
    }

    if (targetArea === 'GLOBO') {
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: roll.current_stage,
        to_stage: targetArea,
        operator_id: operator_id || null,
        action: 'BLOQUEO_RUTEO_INVALIDO',
        notes: 'Bloqueo de negocio: los rollos de tela no pueden ingresar a Globo.',
      }, transaction ? { transaction } : {});
      return {
        is_allowed: false,
        error_code: 'GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT',
        roll: { roll_code: roll.roll_code, qr_code: roll.qr_code, route, current_stage: roll.current_stage, next_allowed_stage: roll.next_allowed_stage },
        message: `⛔ Ninguna salida de Telares puede ingresar a Globo. Ruta registrada: ${route.join(' -> ')}.`,
      };
    }

    if (!route.includes(targetArea)) {
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: roll.current_stage,
        to_stage: targetArea,
        operator_id: operator_id || null,
        action: 'BLOQUEO_RUTEO_INVALIDO',
        notes: `Intento de escaneo no autorizado en ${targetArea}. Ruta oficial: ${route.join(' -> ')}`,
      }, transaction ? { transaction } : {});

      return {
        is_allowed: false,
        error_code: 'AREA_NOT_IN_ROUTE',
        roll: {
          roll_code: roll.roll_code,
          qr_code: roll.qr_code,
          route,
          current_stage: roll.current_stage,
          next_allowed_stage: roll.next_allowed_stage,
        },
        message: `⛔ ACCESO DENEGADO: Este rollo (${roll.roll_code}) no tiene configurado el paso por ${targetArea}. Su siguiente estación requerida es: ${roll.next_allowed_stage}.`,
      };
    }

    if (roll.next_allowed_stage !== targetArea) {
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: roll.current_stage,
        to_stage: targetArea,
        operator_id: operator_id || null,
        action: 'BLOQUEO_RUTEO_INVALIDO',
        notes: `Intento de salto de etapa a ${targetArea}. Se requería antes: ${roll.next_allowed_stage}`,
      }, transaction ? { transaction } : {});

      return {
        is_allowed: false,
        error_code: 'OUT_OF_SEQUENCE',
        roll: {
          roll_code: roll.roll_code,
          qr_code: roll.qr_code,
          route,
          current_stage: roll.current_stage,
          next_allowed_stage: roll.next_allowed_stage,
        },
        message: `⛔ SECUENCIA INVÁLIDA: Este rollo debe procesarse primero en '${roll.next_allowed_stage}' antes de poder ingresar a '${targetArea}'.`,
      };
    }

    return {
      is_allowed: true,
      message: `✔ Ruteo Verificado: Rollo autorizado para procesarse en '${targetArea}'.`,
      roll: {
        id: roll.id,
        roll_code: roll.roll_code,
        qr_code: roll.qr_code,
        meters: roll.meters,
        weight_kg: roll.weight_kg,
        width_cm: roll.width_cm,
        route,
        current_stage: roll.current_stage,
        next_allowed_stage: roll.next_allowed_stage,
        bom_name: roll.bom?.name,
        loom_name: roll.loom?.name,
      },
    };
  }

  /**
   * Procesar el rollo en la estación destino y avanzar la ruta
   */
  async processViajeroStage({ qr_code, target_stage, operator_id, meters_in, meters_out, weight_in_kg, weight_out_kg, notes }) {
    const t = await sequelize.transaction();
    try {
      const normalizedTarget = String(target_stage || '').trim().toUpperCase();
      const validation = await this.validateViajeroScan({ qr_code, area_name: normalizedTarget, operator_id }, t);
      if (!validation.is_allowed) {
        throw Object.assign(new Error(validation.message), { statusCode: 409, code: validation.error_code });
      }

      const clean = normalizeViajeroQr(qr_code);
      const roll = await ViajeroRoll.findOne({
        where: {
          [Op.or]: [
            { qr_code: clean },
            { roll_code: clean },
            { qr_code: `VIAJERO-${clean}` },
            { roll_code: clean.replace(/^VIAJERO-/, '') },
          ],
          is_active: true,
        },
        transaction: t,
        lock: { level: t.LOCK.UPDATE, of: ViajeroRoll },
      });

      const route = roll.route;
      const currentStageIndex = route.indexOf(normalizedTarget);
      const isLastStage = currentStageIndex === route.length - 1;
      const nextStage = isLastStage ? 'TERMINADO' : route[currentStageIndex + 1];

      const now = new Date();
      const history = Array.isArray(roll.stages_history) ? [...roll.stages_history] : [];
      history.push({
        stage: normalizedTarget,
        action: isLastStage ? 'PROCESO_FINALIZADO_TERMINADO' : 'PROCESO_COMPLETADO',
        meters_in: meters_in || roll.meters,
        meters_out: meters_out || roll.meters,
        weight_in_kg: weight_in_kg || roll.weight_kg,
        weight_out_kg: weight_out_kg || roll.weight_kg,
        timestamp: now.toISOString(),
        operator_id,
        notes,
      });

      await roll.update(
        {
          current_stage: normalizedTarget,
          next_allowed_stage: nextStage,
          stages_history: history,
          status: isLastStage ? 'TRANSFORMADO' : 'DISPONIBLE',
          meters: meters_out || roll.meters,
          weight_kg: weight_out_kg || roll.weight_kg,
        },
        { transaction: t }
      );

      const areaMap = {
        TELARES: 3,
        LAMINADO: 4,
        GLOBO: 5,
        CORTE: 6,
        CONFECCION: 7,
      };

      await ViajeroRoutingLog.create(
        {
          viajero_roll_id: roll.id,
          from_stage: roll.current_stage,
          to_stage: normalizedTarget,
          area_id: areaMap[normalizedTarget] || null,
          operator_id,
          action: 'PROCESO_FINALIZADO',
          meters_in: meters_in || roll.meters,
          meters_out: meters_out || roll.meters,
          weight_in_kg: weight_in_kg || roll.weight_kg,
          weight_out_kg: weight_out_kg || roll.weight_kg,
          notes: notes || `Etapa ${normalizedTarget} completada con éxito`,
        },
        { transaction: t }
      );

      await t.commit();
      return {
        success: true,
        message: `Etapa ${normalizedTarget} completada. El rollo ahora debe avanzar a: ${nextStage}.`,
        roll,
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Obtener detalle completo de un Rollo Viajero (Trazabilidad Genética Completa desde Almacén hasta Tejido + Costos)
   */
  async getViajeroDetails(code, currentUser = null) {
    const allowCosts = canViewCosts(currentUser);
    const clean = normalizeViajeroQr(code);
    if (!clean) return null;

    const roll = await ViajeroRoll.findOne({
      where: {
        [Op.or]: [
          { qr_code: clean },
          { roll_code: clean },
          { qr_code: `VIAJERO-${clean}` },
          { roll_code: clean.replace(/^VIAJERO-/, '') },
        ],
      },
      include: [
        { model: Loom, as: 'loom', include: [{ model: Subarea, as: 'subarea' }] },
        {
          model: ProductionBom,
          as: 'bom',
          include: [{ model: ProductionBomItem, as: 'items', include: ['ptiProduct'] }],
        },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username', 'numero_nomina'] },
        { model: User, as: 'shiftSupervisor', attributes: ['id', 'first_name', 'last_name', 'username', 'numero_nomina'] },
        {
          model: ViajeroRollOperatorSegment,
          as: 'operatorSegments',
          include: [{ model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username', 'numero_nomina'] }],
        },
        {
          model: LoomBackflushConsumption,
          as: 'consumptions',
          include: [
            { model: PtiRack, as: 'rack' },
            { model: PtiProduct, as: 'ptiProduct' },
            { model: LoomPtiWip, as: 'sourceWipItem' },
          ],
        },
        {
          model: ViajeroRoutingLog,
          as: 'routingLogs',
          include: [{ model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'numero_nomina'] }],
        },
      ],
    });

    if (!roll) return null;

    // Obtener genealogía hacia atrás (Extrusión -> Silos / Materias Primas)
    const exactEntryIds = [...new Set((roll.consumptions || []).map((c) => c.sourceWipItem?.source_production_entry_id).filter(Boolean).map(Number))];
    let extrusionEntries = [];
    if (exactEntryIds.length) {
      extrusionEntries = await ExtrusionProductionEntry.findAll({
          where: { id: exactEntryIds },
          include: [
            { model: Extruder, as: 'extruder' },
            { model: PtiProduct, as: 'ptiProduct' },
            {
              model: ProcessPreparation,
              as: 'preparation',
              attributes: ['id', 'folio', 'formula_id', 'formula_snapshot', 'cost_index_snapshot', 'material_cost_snapshot', 'transformed_value_snapshot', 'transformed_cost_per_kg', 'cost_valuation_status'],
              include: [{
                model: ProcessPreparationInput,
                as: 'inputs',
                attributes: ['id', 'material_id', 'quantity', 'unit', 'source_lote_id', 'source_silo_id', 'source_qr_code_id', 'source_traceable_item_id', 'source_lot_number', 'unit_cost_snapshot', 'extended_cost_snapshot'],
                include: [
                  { model: Material, as: 'material', attributes: ['id', 'name', 'internal_code'] },
                  { model: Lote, as: 'sourceLot', attributes: ['id', 'folio'] },
                  { model: Silo, as: 'sourceSilo', attributes: ['id', 'code', 'name', 'current_lot_number'] },
                  { model: QrCode, as: 'sourceQrCode', attributes: ['id', 'qr_code', 'purpose'] },
                  { model: TraceableItem, as: 'sourceTraceableItem', attributes: ['id', 'reference_folio', 'supplier_lot', 'quantity_initial', 'unit'] },
                ],
              }],
            },
          ],
          order: [['created_at', 'DESC']],
        });
    }
    const genealogyEntries = extrusionEntries.map((entry) => entry.toJSON ? entry.toJSON() : entry);
    const rawMaterials = genealogyEntries.flatMap((entry) => (entry.preparation?.inputs || []).map((input) => ({
      extrusion_entry_id: entry.id,
      mixture_qr: entry.mixture_qr,
      pti_code: entry.ptiProduct?.code || null,
      material_id: input.material_id,
      material_name: input.material?.name || input.material?.internal_code || `Material ${input.material_id}`,
      material_code: input.material?.internal_code || null,
      quantity: Number(input.quantity),
      unit: input.unit,
      source_type: input.sourceSilo ? 'SILO' : input.sourceLot ? 'LOTE_WIP' : input.sourceQrCode ? 'QR_WIP' : 'ORIGEN_NO_REGISTRADO',
      source_silo: input.sourceSilo ? {
        id: input.sourceSilo.id,
        code: input.sourceSilo.code,
        name: input.sourceSilo.name,
        lot_number: input.source_lot_number || input.sourceSilo.current_lot_number || null,
      } : null,
      source_lot: input.sourceLot ? {
        id: input.sourceLot.id,
        folio: input.source_lot_number || input.sourceLot.folio,
      } : input.source_lot_number ? { folio: input.source_lot_number } : null,
      source_qr: input.sourceQrCode?.qr_code || null,
      source_traceable_item_id: input.sourceTraceableItem?.id || input.source_traceable_item_id || null,
      source_reference: input.sourceTraceableItem?.reference_folio || input.sourceTraceableItem?.supplier_lot || null,
      unit_cost_snapshot: input.unit_cost_snapshot == null ? null : Number(input.unit_cost_snapshot),
      extended_cost_snapshot: input.extended_cost_snapshot == null ? null : Number(input.extended_cost_snapshot),
    })));
    const genealogyIsExact = exactEntryIds.length > 0 && genealogyEntries.length === exactEntryIds.length;

    const rollData = roll.toJSON();
    const rollCost = roll.cost_data_complete ? Number(roll.calculated_roll_cost || 0) : null;
    const costPerMeter = Number(roll.meters) > 0 ? rollCost / Number(roll.meters) : 0;
    const costPerKg = Number(roll.weight_kg) > 0 ? rollCost / Number(roll.weight_kg) : 0;
    const sourcePtiCost = (roll.consumptions || []).reduce((sum, row) => sum + Number(row.material_cost_mxn || 0), 0);
    const telaresTransformationCost = rollCost == null ? null : Number((rollCost - sourcePtiCost).toFixed(4));
    const completedTransformations = (roll.stages_history || [])
      .filter((entry) => String(entry.action || '').toUpperCase() === 'TRANSFORMADO'
        && !['NONE', 'TELARES'].includes(String(entry.stage || '').toUpperCase()))
      .map((entry) => {
        const transformedCost = Number(entry.new_transformed_cost);
        const costIsRecorded = entry.new_transformed_cost != null && Number.isFinite(transformedCost);
        return {
          stage: entry.stage,
          transformed_cost_mxn: costIsRecorded ? transformedCost : null,
          material_cost_mxn: entry.stage_material_cost == null ? null : Number(entry.stage_material_cost),
          transformation_index: entry.transformation_index == null ? null : Number(entry.transformation_index),
          recorded_cost_mxn: costIsRecorded ? transformedCost : null,
          cost_status: costIsRecorded ? 'REGISTRADO' : 'INCOMPLETO',
          recorded_at: entry.timestamp || null,
          notes: entry.notes || null,
        };
      });
    const completedStageNames = new Set(completedTransformations.map((entry) => String(entry.stage).toUpperCase()));
    const pendingStages = (roll.routingLogs || [])
      .filter((log) => {
        const stage = String(log.to_stage || '').toUpperCase();
        return !['NONE', 'TELARES'].includes(stage) && !completedStageNames.has(stage);
      })
      .map((log) => ({
        stage: log.to_stage,
        recorded_cost_mxn: null,
        cost_status: 'NO_REGISTRADO',
        recorded_at: log.created_at,
        notes: log.notes,
      }));
    const laterStages = [...completedTransformations, ...pendingStages]
      .sort((a, b) => new Date(a.recorded_at || 0) - new Date(b.recorded_at || 0));

    if (!allowCosts) {
      const stripCosts = (value) => {
        if (Array.isArray(value)) return value.map(stripCosts);
        if (!value || typeof value !== 'object') return value;
        return Object.fromEntries(Object.entries(value)
          .filter(([key]) => !/(cost|price|valuation|value_mxn|unit_price|transformation_index|cost_data_complete)/i.test(key))
          .map(([key, nested]) => [key, stripCosts(nested)]));
      };
      return {
        ...stripCosts(rollData),
        genealogy_tree: {
          extrusion_entries: stripCosts(genealogyEntries),
          raw_materials: stripCosts(rawMaterials),
          exact_source_entries: genealogyIsExact,
          source_entry_count: genealogyEntries.length,
        },
      };
    }

    return {
      ...rollData,
      cost_summary: {
        total_roll_cost: rollCost,
        cost_per_meter: rollCost == null ? null : costPerMeter,
        cost_per_kg: rollCost == null ? null : costPerKg,
        cost_transformation_index: Number(roll.cost_transformation_index || 1),
        complete: Boolean(roll.cost_data_complete),
        stages: [
          { stage: 'EXTRUSION_PTI_CONSUMIDO', material_cost_mxn: roll.cost_data_complete ? Number(sourcePtiCost.toFixed(4)) : null, cost_status: roll.cost_data_complete ? 'REGISTRADO' : 'INCOMPLETO' },
          { stage: 'TELARES', input_cost_mxn: roll.cost_data_complete ? Number(sourcePtiCost.toFixed(4)) : null, transformation_index: Number(roll.cost_transformation_index || 1), transformed_cost_mxn: rollCost, transformation_added_mxn: telaresTransformationCost, cost_status: roll.cost_data_complete ? 'REGISTRADO' : 'INCOMPLETO' },
          ...laterStages,
        ],
      },
      genealogy_tree: {
        extrusion_entries: genealogyEntries,
        raw_materials: rawMaterials,
        exact_source_entries: genealogyIsExact,
        source_entry_count: genealogyEntries.length,
      },
    };
  }

  /**
   * Resumen Consolidado de WIP de Telares / Tejido:
   * 1. Nivel Macro Global: Total kg, total bobinas, carritos en piso, ocupación media de filetas, valuación monetaria (sólo admins).
   * 2. Nivel Individual por Telar (1 al 21): Estado, ocupación %, WIP en kg, PTI cargado, color, carrito origen y valuación individual.
   */
  async getWipSummary(currentUser = null) {
    const allowCosts = canViewCosts(currentUser);

    const looms = await Loom.findAll({
      where: { is_active: true },
      include: [
        { model: Subarea, as: 'subarea', attributes: ['id', 'name', 'nomenclature'] },
        {
          model: PtiRack,
          as: 'warpRack',
          include: [{ model: PtiProduct, as: 'currentPtiProduct' }],
        },
        {
          model: LoomRun,
          as: 'runs',
          where: { status: 'EN_PROCESO' },
          required: false,
          include: [
            { model: ProductionBom, as: 'bom' },
            { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'numero_nomina'] },
          ],
        },
      ],
      order: [
        ['loom_number', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    const availableCarts = await PtiRack.findAll({
      where: {
        current_quantity: { [Op.gt]: 0 },
        custody_shift_session_id: null,
      },
      include: [
        {
          model: PtiProduct,
          as: 'currentPtiProduct',
          include: [{ model: Formula, as: 'formula' }],
        },
      ],
      order: [['rack_code', 'ASC']],
    });
    const transferMode = await this.getPtiTransferMode();
    const loomPtiWipRows = await LoomPtiWip.findAll({
      where: { quantity_remaining_spools: { [Op.gt]: 0 } },
      include: [{ model: PtiProduct, as: 'ptiProduct' }],
      order: [['received_at', 'ASC'], ['id', 'ASC']],
    });
    const ptiWipByLoom = new Map();
    for (const row of loomPtiWipRows) {
      const plain = row.toJSON();
      const key = `${plain.loom_id}:${plain.pti_product_id}:${plain.color_snapshot || ''}:${plain.denier_snapshot || ''}:${plain.tape_width_mm_snapshot || ''}`;
      const quantity = Number(plain.quantity_remaining_spools || 0);
      const weightKg = Number((quantity * Number(plain.unit_weight_kg || 0)).toFixed(3));
      const unitCost = plain.unit_cost_per_kg == null ? null : Number(plain.unit_cost_per_kg);
      const current = ptiWipByLoom.get(plain.loom_id) || new Map();
      const item = current.get(key) || {
        pti_product_id: plain.pti_product_id,
        code: plain.ptiProduct?.code || `PTI-${plain.pti_product_id}`,
        name: plain.ptiProduct?.name || 'PTI sin nombre',
        color: plain.color_snapshot || plain.ptiProduct?.color || 'Sin color registrado',
        denier: plain.denier_snapshot ?? plain.ptiProduct?.denier ?? null,
        tape_width_mm: plain.tape_width_mm_snapshot == null ? (plain.ptiProduct?.tape_width_mm == null ? null : Number(plain.ptiProduct.tape_width_mm)) : Number(plain.tape_width_mm_snapshot),
        quantity_spools: 0,
        quantity_kg: 0,
        value_mxn: 0,
        valuation_complete: true,
        source_carts: new Set(),
      };
      item.quantity_spools += quantity;
      item.quantity_kg += weightKg;
      if (unitCost == null) item.valuation_complete = false;
      else item.value_mxn += weightKg * unitCost;
      if (plain.source_qr_code) item.source_carts.add(plain.source_qr_code);
      current.set(key, item);
      ptiWipByLoom.set(plain.loom_id, current);
    }

    let totalWipKg = 0;
    let totalSpools = 0;
    let totalValuationMxn = 0;
    let totalValuationComplete = true;
    const totalCreelCapacity = looms.reduce((sum, loom) => sum + Number(loom.creel_capacity_spools || 1800), 0);
    let totalOccupancySum = 0;
    let activeLoomsCount = 0;

    const mappedLooms = looms.map((l) => {
      const spools = Number(l.current_spools_count || 0);
      const wipKg = Number(l.current_wip_kg || 0);
      const cap = Number(l.creel_capacity_spools || 1800);
      const utilPct = cap > 0 ? Math.min(100, Math.round((spools / cap) * 100)) : 0;

      const activeRun = l.runs && l.runs.length > 0 ? l.runs[0] : null;
      const isProducing = l.status === 'EN_PRODUCCION' || l.status === 'TEJIENDO' || Boolean(activeRun);

      totalWipKg += wipKg;
      totalSpools += spools;
      totalOccupancySum += utilPct;
      if (isProducing) activeLoomsCount += 1;

      const itemMap = ptiWipByLoom.get(l.id) || new Map();
      const ptiInventory = [...itemMap.values()].map((item) => ({
        ...item,
        quantity_spools: Number(item.quantity_spools.toFixed(2)),
        quantity_kg: Number(item.quantity_kg.toFixed(3)),
        valuation_mxn: allowCosts && item.valuation_complete ? Number(item.value_mxn.toFixed(2)) : null,
        source_carts: [...item.source_carts],
      }));
      const ledgerSpools = ptiInventory.reduce((sum, item) => sum + item.quantity_spools, 0);
      const ledgerKg = ptiInventory.reduce((sum, item) => sum + item.quantity_kg, 0);
      const legacySpools = Math.max(0, Number((spools - ledgerSpools).toFixed(2)));
      const legacyKg = Math.max(0, Number((wipKg - ledgerKg).toFixed(3)));
      if (legacySpools > 0.01 || legacyKg > 0.01) {
        ptiInventory.push({
          pti_product_id: null,
          code: 'HISTORICO-SIN-DETALLE',
          name: 'WIP previo sin desglose por PTI',
          color: 'Pendiente de conciliación',
          denier: null,
          tape_width_mm: null,
          quantity_spools: legacySpools,
          quantity_kg: legacyKg,
          valuation_mxn: null,
          valuation_complete: false,
          source_carts: [],
        });
      }
      const loomHasIncompleteValuation = ptiInventory.some((item) => !item.valuation_complete);
      const loomValuation = allowCosts && !loomHasIncompleteValuation
        ? Number(ptiInventory.reduce((sum, item) => sum + Number(item.valuation_mxn || 0), 0).toFixed(2))
        : null;
      if (allowCosts) {
        if (loomValuation == null) totalValuationComplete = false;
        else totalValuationMxn += loomValuation;
      }

      const ptiInfo = ptiInventory.length === 1
        ? ptiInventory[0]
        : ptiInventory.length > 1
          ? { code: 'VARIOS-PTI', name: 'Múltiples PTI', color: `${ptiInventory.length} productos`, denier: null, cart_code: null }
          : null;

      return {
        id: l.id,
        loom_number: l.loom_number || l.id,
        code: l.code,
        name: l.name,
        type: l.type,
        model: l.model,
        subarea_id: l.subarea_id,
        subarea: l.subarea ? { id: l.subarea.id, name: l.subarea.name, nomenclature: l.subarea.nomenclature } : null,
        rpm: l.rpm,
        status: isProducing ? 'TEJIENDO' : (l.status || 'DISPONIBLE'),
        creel_capacity_spools: cap,
        current_spools_count: spools,
        current_wip_kg: wipKg,
        pti_inventory: ptiInventory,
        creel_utilization_pct: utilPct,
        active_pti: ptiInfo,
        active_cart: l.warpRack?.rack_code || null,
        active_run: activeRun
          ? {
              id: activeRun.id,
              bom_code: activeRun.bom?.code,
              bom_name: activeRun.bom?.name,
              shift: activeRun.shift,
              operator_name: activeRun.operator ? `${activeRun.operator.first_name || ''} ${activeRun.operator.last_name || ''}`.trim() : null,
              meters_planned: activeRun.meters_planned,
              meters_produced: activeRun.meters_produced,
            }
          : null,
        valuation_mxn: loomValuation,
      };
    });

    const avgCreelPct = looms.length > 0 ? Math.round(totalOccupancySum / looms.length) : 0;

    const mappedCarts = availableCarts.filter(isRackAuthorizedForTelares).map((c) => {
      const plain = c.toJSON();
      const qty = Number(plain.current_quantity || 0);
      const unitWRaw = plain.unit_weight_kg || plain.currentPtiProduct?.unit_weight_kg;
      const tare = plain.tare_weight_kg == null ? null : Number(plain.tare_weight_kg);
      const unitW = unitWRaw == null ? null : Number(unitWRaw);
      const net = unitW == null ? null : Number((qty * unitW).toFixed(2));
      const gross = net == null || tare == null ? null : Number((tare + net).toFixed(2));
      const costPerKg = Number(plain.unit_cost_per_kg || 0);

      return {
        id: plain.id,
        rack_code: plain.rack_code,
        qr_code: plain.qr_code,
        container_type: plain.container_type || 'RACK',
        current_quantity: qty,
        unit_weight_kg: unitW,
        tare_weight_kg: tare,
        net_weight_kg: net,
        gross_weight_kg: gross,
        status: plain.status,
        pti_product: plain.currentPtiProduct
          ? {
              id: plain.currentPtiProduct.id,
              code: plain.currentPtiProduct.code,
              name: plain.currentPtiProduct.name,
              color: plain.currentPtiProduct.color,
              denier: plain.currentPtiProduct.denier,
              tape_width_mm: plain.currentPtiProduct.tape_width_mm == null ? null : Number(plain.currentPtiProduct.tape_width_mm),
              extrusion_machine_number: plain.currentPtiProduct.extrusion_machine_number || null,
            }
          : null,
        valuation_mxn: allowCosts && net != null && costPerKg > 0 ? Number((net * costPerKg).toFixed(2)) : null,
      };
    });

    return {
      macro: {
        total_wip_kg: Number(totalWipKg.toFixed(2)),
        total_spools: totalSpools,
        total_creel_capacity_spools: totalCreelCapacity,
        free_creel_capacity_spools: Math.max(0, totalCreelCapacity - totalSpools),
        total_looms_active: activeLoomsCount,
        total_looms_count: looms.length,
        avg_creel_utilization_pct: avgCreelPct,
        active_carts_in_floor: mappedCarts.length,
        total_valuation_mxn: allowCosts && totalValuationComplete ? Number(totalValuationMxn.toFixed(2)) : null,
        valuation_complete: allowCosts ? totalValuationComplete : null,
        allow_costs: allowCosts,
      },
      transfer_mode: transferMode,
      available_carts: mappedCarts,
      looms: mappedLooms,
    };
  }

  async getPerformanceSummary(days = 7) {
    const periodDays = Number(days) === 30 ? 30 : 7;
    const today = getCdmxDateString(nowCdmx());
    const dayCursor = new Date(`${today}T12:00:00-06:00`);
    const dateKeys = [];
    for (let offset = periodDays - 1; offset >= 0; offset -= 1) {
      const date = new Date(dayCursor);
      date.setDate(date.getDate() - offset);
      dateKeys.push(getCdmxDateString(date));
    }
    const since = new Date(`${dateKeys[0]}T00:00:00-06:00`);

    const runs = await LoomRun.findAll({
      where: {
        status: 'FINALIZADA',
        finished_at: { [Op.gte]: since },
      },
      attributes: [
        'id', 'loom_id', 'meters_planned', 'meters_produced',
        'total_weight_produced_kg', 'rolls_produced_count', 'finished_at',
      ],
      include: [{ model: Loom, as: 'loom', attributes: ['loom_number', 'name'] }],
      order: [['finished_at', 'ASC'], ['id', 'ASC']],
    });

    const daily = new Map(dateKeys.map((date) => [date, {
      date,
      meters_produced: 0,
      meters_planned: 0,
      weight_produced_kg: 0,
      rolls_produced: 0,
      runs_completed: 0,
    }]));
    const byLoom = new Map();
    let metersProduced = 0;
    let metersPlanned = 0;
    let weightProducedKg = 0;
    let rollsProduced = 0;

    for (const run of runs) {
      const date = getCdmxDateString(run.finished_at);
      const meters = Number(run.meters_produced || 0);
      const planned = Number(run.meters_planned || 0);
      const weight = Number(run.total_weight_produced_kg || 0);
      const rolls = Number(run.rolls_produced_count || 0);
      const day = daily.get(date);
      if (day) {
        day.meters_produced += meters;
        day.meters_planned += planned;
        day.weight_produced_kg += weight;
        day.rolls_produced += rolls;
        day.runs_completed += 1;
      }

      metersProduced += meters;
      metersPlanned += planned;
      weightProducedKg += weight;
      rollsProduced += rolls;

      const loomId = run.loom_id;
      const loom = byLoom.get(loomId) || {
        loom_number: run.loom?.loom_number || loomId,
        name: run.loom?.name || `Telar ${run.loom?.loom_number || loomId}`,
        meters_produced: 0,
        weight_produced_kg: 0,
        rolls_produced: 0,
        runs_completed: 0,
      };
      loom.meters_produced += meters;
      loom.weight_produced_kg += weight;
      loom.rolls_produced += rolls;
      loom.runs_completed += 1;
      byLoom.set(loomId, loom);
    }

    const round = (value, digits = 1) => Number(value.toFixed(digits));
    return {
      period_days: periodDays,
      totals: {
        meters_produced: round(metersProduced),
        meters_planned: round(metersPlanned),
        weight_produced_kg: round(weightProducedKg),
        rolls_produced: rollsProduced,
        runs_completed: runs.length,
        plan_achievement_pct: metersPlanned > 0 ? round((metersProduced / metersPlanned) * 100) : null,
      },
      daily: [...daily.values()].map((day) => ({
        ...day,
        meters_produced: round(day.meters_produced),
        meters_planned: round(day.meters_planned),
        weight_produced_kg: round(day.weight_produced_kg),
      })),
      by_loom: [...byLoom.values()]
        .map((loom) => ({
          ...loom,
          meters_produced: round(loom.meters_produced),
          weight_produced_kg: round(loom.weight_produced_kg),
        }))
        .sort((a, b) => b.meters_produced - a.meters_produced)
        .slice(0, 8),
    };
  }
}

module.exports = new TelaresService();
