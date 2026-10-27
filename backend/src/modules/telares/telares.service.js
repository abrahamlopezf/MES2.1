const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const { getCdmxDateString, getCdmxShift, nowCdmx } = require('../../utils/timezone');
const { isSupervisor, canViewCosts, getUserAreaCode } = require('../../shared/security/accessRules');
const normalizeViajeroQr = require('../../shared/utils/normalizeViajeroQr');
const {
  sequelize,
  Loom,
  ProductionBom,
  ProductionBomItem,
  LoomRun,
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
  AuditLog,
  Notification,
  ExtrusionProductionEntry,
  ProcessPreparation,
  ProcessPreparationInput,
  Lote,
  Silo,
  Extruder,
} = require('../../database/models');

class TelaresService {
  normalizeProductionRoute(route) {
    const stages = Array.isArray(route)
      ? route.map((stage) => String(stage || '').trim().toUpperCase())
      : [];
    const validStages = ['TELARES', 'GLOBO', 'LAMINADO', 'CORTE', 'CONFECCION'];
    if (
      stages.length < 2 ||
      stages[0] !== 'TELARES' ||
      stages.some((stage) => !validStages.includes(stage)) ||
      new Set(stages).size !== stages.length
    ) {
      throw Object.assign(
        new Error('La ruta debe iniciar en TELARES, incluir al menos una etapa posterior y no repetir etapas.'),
        { statusCode: 400, code: 'INVALID_PRODUCTION_ROUTE' }
      );
    }
    return stages;
  }

  calculateBomPtiDemand(bom, plannedMeters) {
    const meters = Number(plannedMeters);
    if (!Number.isFinite(meters) || meters <= 0) throw Object.assign(new Error('Los metros objetivo deben ser mayores a cero.'), { statusCode: 400 });
    if (!Array.isArray(bom.items) || !bom.items.length || bom.items.some((item) => !Number(item.pti_product_id))) {
      throw Object.assign(new Error(`La ficha ${bom.code} necesita al menos un PTI de Extrusión vinculado.`), { statusCode: 409, code: 'BOM_PTI_REQUIRED' });
    }
    const standardMeters = Number(bom.standard_output_meters || 0);
    const expectedOutputs = Number(bom.expected_output_quantity || 1);
    const outputMultiplier = standardMeters > 0 ? (meters / standardMeters) * expectedOutputs : null;

    return (bom.items || []).map((item) => {
      const requiredQuantity = Number(item.required_quantity || 0);
      const unit = String(item.required_unit || 'KG').toUpperCase();
      let requiredKg = null;
      let requiredSpools = null;
      if (requiredQuantity > 0 && outputMultiplier) {
        if (unit === 'KG') requiredKg = requiredQuantity * outputMultiplier;
        else if (unit === 'PIEZAS') requiredSpools = requiredQuantity * outputMultiplier;
      } else {
        const gramsPerMeter = Number(item.consumption_g_per_m || 0);
        const fallbackGrams = Number(bom.target_weight_g_per_m || 0) * Number(item.ratio_percentage || 0) / 100;
        const consumptionGramsPerMeter = gramsPerMeter > 0 ? gramsPerMeter : fallbackGrams;
        if (consumptionGramsPerMeter <= 0) {
          throw Object.assign(new Error(`La ficha ${bom.code} no tiene consumo configurado para ${item.ptiProduct?.code || `PTI ${item.pti_product_id}`}.`), { statusCode: 409, code: 'BOM_PTI_CONSUMPTION_REQUIRED' });
        }
        requiredKg = (consumptionGramsPerMeter * meters) / 1000;
      }
      return { item, requiredKg, requiredSpools, outputMultiplier };
    });
  }

  async assessLoomPtiAvailability({ loomId, bom, plannedMeters, transaction }) {
    const demands = this.calculateBomPtiDemand(bom, plannedMeters);
    const productIds = demands.map(({ item }) => Number(item.pti_product_id)).filter(Boolean);
    const [wipRows, racks] = await Promise.all([
      LoomPtiWip.findAll({
        where: { loom_id: loomId, pti_product_id: { [Op.in]: productIds }, quantity_remaining_spools: { [Op.gt]: 0 } },
        order: [['received_at', 'ASC'], ['id', 'ASC']],
        transaction,
        ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
      }),
      PtiRack.findAll({
        where: { current_pti_product_id: { [Op.in]: productIds }, current_quantity: { [Op.gt]: 0 } },
        attributes: ['id', 'rack_code', 'qr_code', 'current_pti_product_id', 'current_quantity', 'unit_weight_kg', 'container_type', 'created_at'],
        include: [{ model: PtiProduct, as: 'currentPtiProduct', attributes: ['id', 'code', 'name', 'color'], required: false }],
        order: [['created_at', 'ASC'], ['id', 'ASC']],
        transaction,
        // The PTI is an optional LEFT JOIN; lock only rows from the rack table.
        ...(transaction ? { lock: { level: transaction.LOCK.UPDATE, of: PtiRack } } : {}),
      }),
    ]);
    const mode = await this.getPtiTransferMode(transaction);
    const shortages = demands.map(({ item, requiredKg, requiredSpools }) => {
      const productId = Number(item.pti_product_id);
      const productWip = wipRows.filter((row) => Number(row.pti_product_id) === productId);
      const productRacks = racks.filter((rack) => Number(rack.current_pti_product_id) === productId);
      const wipSpools = productWip.reduce((sum, row) => sum + Number(row.quantity_remaining_spools || 0), 0);
      const wipKg = productWip.reduce((sum, row) => sum + Number(row.quantity_remaining_spools || 0) * Number(row.unit_weight_kg || 0), 0);
      const knownSpoolWeights = [
        ...productWip.map((row) => Number(row.unit_weight_kg || 0)),
        ...productRacks.map((rack) => Number(rack.unit_weight_kg || 0)),
      ].filter((weight) => weight > 0);
      const averageSpoolKg = knownSpoolWeights.length ? knownSpoolWeights.reduce((sum, weight) => sum + weight, 0) / knownSpoolWeights.length : null;
      const normalizedRequiredKg = requiredKg ?? (requiredSpools != null && averageSpoolKg ? requiredSpools * averageSpoolKg : null);
      const normalizedRequiredSpools = requiredSpools ?? (requiredKg != null && averageSpoolKg ? requiredKg / averageSpoolKg : null);
      const deficitKg = normalizedRequiredKg == null ? null : Math.max(0, normalizedRequiredKg - wipKg);
      const deficitSpools = deficitKg != null && averageSpoolKg ? deficitKg / averageSpoolKg : (normalizedRequiredSpools == null ? null : Math.max(0, normalizedRequiredSpools - wipSpools));
      const fifoRacks = [];
      let suggestedKg = 0;
      for (const rack of productRacks) {
        if (deficitKg == null || suggestedKg >= deficitKg) break;
        const rackKg = Number(rack.current_quantity) * Number(rack.unit_weight_kg || 0);
        fifoRacks.push({ qr_code: rack.qr_code, rack_code: rack.rack_code, color: item.ptiProduct?.color || rack.currentPtiProduct?.color || null, spools: Number(rack.current_quantity), weight_kg: rack.unit_weight_kg ? Number(rackKg.toFixed(3)) : null });
        suggestedKg += rackKg;
        if (mode === 'RACK_PARTIAL' && suggestedKg >= deficitKg) break;
      }
      return {
        pti_product_id: productId,
        code: item.ptiProduct?.code || `PTI-${productId}`,
        name: item.ptiProduct?.name || null,
        color: item.ptiProduct?.color || null,
        role: item.role,
        required_kg: normalizedRequiredKg == null ? null : Number(normalizedRequiredKg.toFixed(3)),
        required_spools: normalizedRequiredSpools == null ? null : Number(normalizedRequiredSpools.toFixed(2)),
        wip_kg: Number(wipKg.toFixed(3)),
        wip_spools: Number(wipSpools.toFixed(2)),
        deficit_kg: deficitKg == null ? null : Number(deficitKg.toFixed(3)),
        deficit_spools: deficitSpools == null ? null : Number(deficitSpools.toFixed(2)),
        fifo_racks: fifoRacks,
        estimated_full_containers: mode === 'CART_FULL' && deficitKg > 0 ? fifoRacks.length : null,
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
      attributes: ['id', 'rack_code', 'qr_code', 'current_quantity', 'current_pti_type_id', 'current_pti_product_id', 'destination_subarea_id', 'status', 'container_type', 'unit_weight_kg', 'created_at'],
      include: [{
        model: PtiProduct,
        as: 'currentPtiProduct',
        attributes: ['id', 'code', 'name', 'color', 'denier', 'tape_width_mm', 'extrusion_machine_number'],
        required: false,
      }],
    });
  }

  async getAvailablePtiRacks() {
    return PtiRack.findAll({
      where: { current_quantity: { [Op.gt]: 0 } },
      attributes: ['id', 'rack_code', 'qr_code', 'current_quantity', 'current_pti_type_id', 'current_pti_product_id', 'destination_subarea_id', 'status', 'container_type', 'unit_weight_kg', 'created_at'],
      include: [{
        model: PtiProduct,
        as: 'currentPtiProduct',
        attributes: ['id', 'code', 'name', 'color', 'denier', 'tape_width_mm', 'extrusion_machine_number'],
        required: false,
      }],
      order: [['created_at', 'ASC'], ['id', 'ASC']],
    });
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
        numero_nomina: u.numero_nomina || '1200',
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
    return await ProductionBom.findAll({
      where: includeInactive ? {} : { is_active: true },
      include: [
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
      if (!ptiIds.length) throw new Error('Selecciona al menos un tipo de PTI de Extrusión que maneje el telar.');
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

      const creelCapacity = Number(payload.creel_capacity_spools ?? loom?.creel_capacity_spools ?? 1800);
      if (creelCapacity <= 0) throw new Error('La capacidad del creel debe ser mayor a cero.');

      const values = {
        code,
        name,
        loom_number: loomNumber,
        creel_capacity_spools: creelCapacity,
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

      if (values.subarea_id !== null) {
        const subarea = await Subarea.findOne({
          where: { id: values.subarea_id, is_active: true },
          include: [{ model: Area, where: { code: 'TELARES' }, required: true }],
          transaction: t,
        });
        if (!subarea) throw new Error('La subárea seleccionada no pertenece al área de Telares.');
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
   * REGLA OPERACIONAL ATÓMICA: La transferencia de PTI entre Extrusión y Telares se realiza ESTRICTAMENTE por carrito
   * de transporte completo (100% de las bobinas). Queda estrictamente prohibido transferir fragmentos o partes de un carrito.
   * La cantidad completa deja de ser custodiada por Extrusión (pasa a VACIO) y se suma al WIP específico del telar seleccionado.
   */
  async loadLoomCreel({ loom_id, rack_id, spools_to_load, operator_id }) {
    const t = await sequelize.transaction();
    try {
      const transferMode = await this.getPtiTransferMode(t);
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

      let requiredSubareaId = rack.destination_subarea_id || null;
      if (!requiredSubareaId && Number(ptiProduct.extrusion_machine_number) === 1) {
        const telaresArea = await Area.findOne({ where: { code: 'TELARES' }, transaction: t });
        const bandSubarea = telaresArea && await Subarea.findOne({
          where: { area_id: telaresArea.id, nomenclature: 'TB', is_active: true },
          transaction: t,
        });
        if (!bandSubarea) {
          const error = new Error('No se puede identificar la subárea Telares Banda para el PTI de la Extrusora 1.');
          error.statusCode = 409;
          throw error;
        }
        requiredSubareaId = bandSubarea.id;
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
      const addedWeightKg = parseFloat((spools * unitWeight).toFixed(2));
      const newLoomSpools = parseFloat((currentSpools + spools).toFixed(2));
      const newLoomWipKg = parseFloat((Number(loom.current_wip_kg || 0) + addedWeightKg).toFixed(2));
      const newRackBalance = parseFloat((availableInRack - spools).toFixed(2));

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
          active_warp_rack_id: rack.id,
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
      if (!Array.isArray(items) || items.length === 0) throw new Error('Agrega al menos un tipo de PTI de Extrusión requerido.');

      const route = this.normalizeProductionRoute(payload.default_route ?? bom?.default_route ?? ['TELARES', 'LAMINADO', 'CORTE']);

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

      const normalizedItems = [];
      for (const item of items) {
        const ptiId = Number(item.pti_product_id);
        const pti = ptiId > 0 ? await PtiProduct.findByPk(ptiId, { transaction: t }) : null;
        if (!pti || !pti.is_active) throw new Error('Cada componente debe ser un PTI activo del catálogo de Extrusión.');

        // Validar denier del PTI según restricción
        if (restrictDenier1800 && Number(pti.denier) === 1800) {
          throw new Error(`Restricción técnica violada: El PTI '${pti.code}' tiene denier 1800, el cual está estrictamente prohibido para telas de 6.5 oz a 8.0 oz.`);
        }

        const role = String(item.role || '').trim().toUpperCase();
        if (!['URDIMBRE', 'TRAMA', 'AMBOS', 'REFUERZO'].includes(role)) throw new Error(`Rol de componente no válido para el PTI ${pti.code}.`);
        const ratio = Number(item.ratio_percentage ?? 0);
        const consumption = Number(item.consumption_g_per_m ?? 0);
        const requiredQuantity = item.required_quantity === '' || item.required_quantity === null || item.required_quantity === undefined
          ? null
          : Number(item.required_quantity);
        const requiredUnit = String(item.required_unit || 'KG').toUpperCase();
        if (!Number.isFinite(ratio) || ratio < 0 || ratio > 100 || !Number.isFinite(consumption) || consumption < 0) throw new Error(`Consumo o proporción no válida para ${pti.code}.`);
        if (requiredQuantity === null || !Number.isFinite(requiredQuantity) || requiredQuantity <= 0) throw new Error(`Indica la cantidad de PTI requerida por rollo para ${pti.code}.`);
        if (!['KG', 'PIEZAS'].includes(requiredUnit)) throw new Error('La unidad requerida debe ser KG o PIEZAS.');
        normalizedItems.push({
          pti_product_id: pti.id,
          role,
          ratio_percentage: ratio,
          consumption_g_per_m: consumption,
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
        target_width_cm: Number(payload.target_width_cm ?? bom?.target_width_cm ?? 50),
        target_weight_g_per_m: Number(payload.target_weight_g_per_m ?? bom?.target_weight_g_per_m ?? 65),
        warp_density: Number(payload.warp_density ?? bom?.warp_density ?? 10),
        weft_density: Number(payload.weft_density ?? bom?.weft_density ?? 10),
        output_product_name: String(payload.output_product_name ?? bom?.output_product_name ?? name).trim(),
        expected_output_quantity: Number(payload.expected_output_quantity ?? bom?.expected_output_quantity ?? 1),
        expected_output_unit: String(payload.expected_output_unit ?? bom?.expected_output_unit ?? 'ROLLO').toUpperCase(),
        standard_output_meters: payload.standard_output_meters === '' || payload.standard_output_meters === null
          ? null
          : Number(payload.standard_output_meters ?? bom?.standard_output_meters ?? 0) || null,
        default_route: route.map((stage) => String(stage).toUpperCase()),
        ounces_yd2: ounces,
        fabric_type: String(payload.fabric_type ?? bom?.fabric_type ?? 'TUBULAR').toUpperCase(),
        tape_color: String(payload.tape_color ?? bom?.tape_color ?? 'N/A').toUpperCase(),
        tape_denier: payload.tape_denier ? Number(payload.tape_denier) : (bom?.tape_denier ?? 2300),
        tape_width_mm: payload.tape_width_mm ? Number(payload.tape_width_mm) : (bom?.tape_width_mm ?? 3.00),
        weft_denier: weftDenierStr || '1800 - 2000',
        warp_denier: warpDenierStr || '1800 - 2000',
        cost_transformation_index: costIndex,
        general_considerations: payload.general_considerations ?? bom?.general_considerations ?? null,
        is_active: payload.is_active ?? bom?.is_active ?? true,
      };

      if (!Number.isFinite(values.target_width_cm) || values.target_width_cm <= 0 || !Number.isFinite(values.expected_output_quantity) || values.expected_output_quantity <= 0) {
        throw new Error('El ancho y la cantidad de salida deben ser mayores a cero.');
      }
      if (values.standard_output_meters !== null && (!Number.isFinite(values.standard_output_meters) || values.standard_output_meters <= 0)) {
        throw new Error('Los metros de referencia de salida deben ser mayores a cero.');
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
      });
      if (!rack) throw new Error(`Rack ID ${rack_id} no encontrado.`);

      if (Number(rack.current_quantity) <= 0) {
        throw new Error(`El Rack '${rack.rack_code}' se encuentra vacío (0 bobinas disponibles).`);
      }
      const ptiProduct = rack.currentPtiProduct;
      if (!ptiProduct || !rack.current_pti_product_id) {
        throw Object.assign(new Error(`El rack ${rack.rack_code} no tiene un PTI exacto identificado.`), { statusCode: 409 });
      }
      let destinationSubareaId = rack.destination_subarea_id || null;
      if (!destinationSubareaId && Number(ptiProduct.extrusion_machine_number) === 1) {
        const area = await Area.findOne({ where: { code: 'TELARES' }, transaction: t });
        const bandSubarea = area && await Subarea.findOne({ where: { area_id: area.id, nomenclature: 'TB', is_active: true }, transaction: t });
        if (!bandSubarea) {
          throw Object.assign(new Error('No se puede identificar la subárea Telares Banda para el PTI de la Extrusora 1.'), { statusCode: 409 });
        }
        destinationSubareaId = bandSubarea.id;
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
      let plannedMeters = Number(meters_planned || 0);
      const plannedWeightKg = Number(weight_planned_kg || 0);
      if (plannedWeightKg > 0) {
        const targetGramsPerMeter = Number(bom.target_weight_g_per_m || 0);
        if (targetGramsPerMeter <= 0) throw Object.assign(new Error(`La ficha ${bom.name} no tiene gramaje objetivo para convertir el peso en metros.`), { statusCode: 409 });
        plannedMeters = plannedWeightKg * 1000 / targetGramsPerMeter;
      }
      if (!Number.isFinite(plannedMeters) || plannedMeters <= 0) throw Object.assign(new Error('Indica una meta válida de metros o peso.'), { statusCode: 400 });
      const supportedBoms = Array.isArray(loom.supported_bom_ids) ? loom.supported_bom_ids.map(Number) : [];
      if (supportedBoms.length && !supportedBoms.includes(Number(bom.id))) {
        throw new Error(`El telar ${loom.name} no está habilitado para producir ${bom.name}.`);
      }

      const availability = await this.assessLoomPtiAvailability({ loomId: loom.id, bom, plannedMeters, transaction: t });
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
          weight_planned_kg: plannedWeightKg > 0 ? Number(plannedWeightKg.toFixed(3)) : Number((plannedMeters * Number(bom.target_weight_g_per_m || 0) / 1000).toFixed(3)),
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
  async finishRollAndBackflush({ run_id, meters, weight_kg, operator_id, recorded_by, shift_supervisor_id, operator_segments, custom_route, notes, shift_number, operator_nomina }) {
    const t = await sequelize.transaction();
    try {
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

      const numMeters = Number(meters);
      const numWeightKg = Number(weight_kg);
      if (isNaN(numMeters) || numMeters <= 0) throw new Error('Los metros producidos deben ser un número mayor a cero.');
      if (isNaN(numWeightKg) || numWeightKg <= 0) throw new Error('El peso neto reportado (kg) debe ser mayor a cero.');

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
      const availability = await this.assessLoomPtiAvailability({ loomId: run.loom_id, bom, plannedMeters: numMeters, transaction: t });
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
      const officialRoute = this.normalizeProductionRoute(
        Array.isArray(custom_route) && custom_route.length > 0 ? custom_route : bom.default_route
      );
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
      let opNomina = primaryOperator?.numero_nomina || operator_nomina;
      if (!opNomina) {
        const opUser = primaryOperator || await User.findByPk(operator_id || run.operator_id, { transaction: t });
        opNomina = opUser?.numero_nomina || '1200';
      }

      // Construcción del código exacto
      let rollCode = `${loomNumber}-${shiftNum}-${rollSeq}-${opNomina}`;
      let collision = 0;
      while (await ViajeroRoll.findOne({ where: { roll_code: rollCode }, transaction: t })) {
        collision++;
        rollCode = `${loomNumber}-${shiftNum}-${rollSeq + collision}-${opNomina}`;
      }
      const qrCode = rollCode;

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
          roll_sequence: rollSeq,
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
          roll_code: rollCode,
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
          roll_sequence: rollSeq,
          operator_nomina: opNomina,
          cost_transformation_index: costTransformationIndex,
          calculated_roll_cost: 0,
          ounces_yd2: bom.ounces_yd2,
          fabric_type: bom.fabric_type,
          tape_color: bom.tape_color,
        },
        { transaction: t }
      );

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
      const requiredByProduct = this.calculateBomPtiDemand(bom, numMeters);
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
          const consumedKg = Number((consumedPieces * Number(wipRow.unit_weight_kg)).toFixed(3));
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
      await run.loom.update({
        current_spools_count: Number(Math.max(0, currentCreelSpools - totalSpoolsConsumed).toFixed(2)),
        current_wip_kg: Number(Math.max(0, currentCreelKg - totalWeightConsumed).toFixed(2)),
        total_rolls_produced: rollSeq,
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
      const updatedPtiConsumed = Number(run.total_pti_consumed_kg) + totalPtiDeductedKg;
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

      // Notificar a supervisores de área destino si el rollo fue encaminado a GLOBO o LAMINADO
      if (['GLOBO', 'LAMINADO'].includes(nextAllowedStage)) {
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
   * Validar escaneo de QR Viajero en estaciones
   */
  async validateViajeroScan({ qr_code, area_name, operator_id }, transaction = null) {
    const clean = normalizeViajeroQr(qr_code);
    const targetArea = String(area_name || '').trim().toUpperCase();
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

    const route = roll.route || [];

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

    const mappedCarts = availableCarts.map((c) => {
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
}

module.exports = new TelaresService();
