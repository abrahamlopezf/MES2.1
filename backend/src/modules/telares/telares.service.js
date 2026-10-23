const { Op } = require('sequelize');
const {
  sequelize,
  Loom,
  ProductionBom,
  ProductionBomItem,
  LoomRun,
  ViajeroRoll,
  ViajeroRoutingLog,
  LoomBackflushConsumption,
  PtiRack,
  PtiProduct,
  Material,
  User,
  Area,
  WipInventory,
  AuditLog,
} = require('../../database/models');

class TelaresService {
  /**
   * Listar todos los telares con sus Racks Maestros activos y BOM actual
   */
  async getLooms() {
    return await Loom.findAll({
      where: { is_active: true },
      include: [
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
          include: [{ model: ProductionBom, as: 'bom' }, { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username'] }],
        },
      ],
      order: [['id', 'ASC']],
    });
  }

  /**
   * Listar recetas / BOMs de producción
   */
  async getBoms() {
    return await ProductionBom.findAll({
      where: { is_active: true },
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
      order: [['id', 'ASC']],
    });
  }

  /**
   * Asignar un Rack Maestro a un Telar (Urdimbre o Trama)
   * Evita el escaneo unitario de bobinas: se asigna el Rack completo
   */
  async assignRackToLoom({ loom_id, rack_id, role, operator_id }) {
    const t = await sequelize.transaction();
    try {
      const loom = await Loom.findByPk(loom_id, { transaction: t });
      if (!loom) throw new Error(`Telar ID ${loom_id} no encontrado.`);

      const rack = await PtiRack.findByPk(rack_id, {
        include: [{ model: PtiProduct, as: 'currentPtiProduct' }],
        transaction: t,
      });
      if (!rack) throw new Error(`Rack ID ${rack_id} no encontrado.`);

      if (Number(rack.current_quantity) <= 0) {
        throw new Error(`El Rack '${rack.rack_code}' se encuentra vacío (0 bobinas disponibles).`);
      }

      const updateData = {};
      const normalizedRole = role.toUpperCase();
      if (normalizedRole === 'URDIMBRE') {
        updateData.active_warp_rack_id = rack.id;
      } else if (normalizedRole === 'TRAMA') {
        updateData.active_weft_rack_id = rack.id;
      } else {
        // Asignar a ambos si es único
        updateData.active_warp_rack_id = rack.id;
        updateData.active_weft_rack_id = rack.id;
      }

      await loom.update(updateData, { transaction: t });

      // Actualizar la corrida activa si existe
      const activeRun = await LoomRun.findOne({
        where: { loom_id: loom.id, status: 'EN_PROCESO' },
        transaction: t,
      });
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
  async startLoomRun({ loom_id, bom_id, operator_id, shift, meters_planned, notes }) {
    const t = await sequelize.transaction();
    try {
      const loom = await Loom.findByPk(loom_id, { transaction: t });
      if (!loom) throw new Error(`Telar ID ${loom_id} no encontrado.`);

      // Verificar si ya tiene corrida activa
      const existingRun = await LoomRun.findOne({
        where: { loom_id, status: 'EN_PROCESO' },
        transaction: t,
      });
      if (existingRun) {
        throw new Error(`El ${loom.name} ya tiene una corrida activa en proceso (${existingRun.folio}).`);
      }

      const bom = await ProductionBom.findByPk(bom_id, {
        include: [{ model: ProductionBomItem, as: 'items' }],
        transaction: t,
      });
      if (!bom) throw new Error(`Receta / BOM ID ${bom_id} no encontrada.`);

      // Generar Folio único
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const count = await LoomRun.count({ transaction: t });
      const folio = `RUN-TEL-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

      const run = await LoomRun.create(
        {
          folio,
          loom_id,
          bom_id,
          operator_id: operator_id || null,
          shift: shift || 'TURNO_1',
          status: 'EN_PROCESO',
          warp_rack_id: loom.active_warp_rack_id || null,
          weft_rack_id: loom.active_weft_rack_id || null,
          meters_planned: meters_planned || 1500.0,
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
   * Registrar producción de rollo de tela, generar QR Viajero con Enrutamiento y ejecutar BACKFLUSHING N a N
   */
  async finishRollAndBackflush({ run_id, meters, weight_kg, operator_id, custom_route, notes }) {
    const t = await sequelize.transaction();
    try {
      const run = await LoomRun.findByPk(run_id, {
        include: [
          { model: Loom, as: 'loom' },
          {
            model: ProductionBom,
            as: 'bom',
            include: [{ model: ProductionBomItem, as: 'items', include: ['ptiProduct'] }],
          },
        ],
        transaction: t,
      });

      if (!run) throw new Error(`Corrida ID ${run_id} no encontrada.`);
      if (run.status !== 'EN_PROCESO') throw new Error(`La corrida ${run.folio} no se encuentra en estado EN_PROCESO.`);

      const numMeters = Number(meters);
      const numWeightKg = Number(weight_kg);
      if (isNaN(numMeters) || numMeters <= 0) throw new Error('Los metros producidos deben ser un número mayor a cero.');
      if (isNaN(numWeightKg) || numWeightKg <= 0) throw new Error('El peso neto reportado (kg) debe ser mayor a cero.');

      const bom = run.bom;
      const widthCm = Number(bom.target_width_cm || 50.0);
      const grammage = (numWeightKg * 1000) / numMeters; // gramos por metro lineal

      // 1. Determinar Ruta Oficial del QR Viajero
      // Por defecto la ruta configurada en el BOM (ej. ["TELARES", "LAMINADO", "CORTE"])
      const officialRoute = custom_route && Array.isArray(custom_route) && custom_route.length > 0 ? custom_route : bom.default_route;

      const currentStage = 'TELARES';
      const nextAllowedStage = officialRoute.length > 1 ? officialRoute[1] : 'CORTE';

      // 2. Generar Identificadores de Rollo y QR Viajero
      const now = new Date();
      const timePart = now.getTime().toString().slice(-6);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const qrCode = `VIAJERO-TEL-${timePart}-${randomSuffix}`;
      
      const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
      const rollCountToday = await ViajeroRoll.count({
        where: {
          loom_id: run.loom_id,
          created_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        transaction: t
      });
      let rollSeq = rollCountToday + 1;
      let rollCode = `ROL-${run.loom.code}-${dateStr}-${rollSeq.toString().padStart(3, '0')}`;
      while (await ViajeroRoll.findOne({ where: { roll_code: rollCode }, transaction: t })) {
        rollSeq++;
        rollCode = `ROL-${run.loom.code}-${dateStr}-${rollSeq.toString().padStart(3, '0')}`;
      }

      // 3. Crear Registro de Rollo con QR Viajero
      const initialHistory = [
        {
          stage: 'TELARES',
          action: 'PRODUCIDO',
          loom_code: run.loom.code,
          meters: numMeters,
          weight_kg: numWeightKg,
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
        },
        { transaction: t }
      );

      // 4. EJECUTAR DEDUCCIÓN MATEMÁTICA (BACKFLUSHING) N a N
      // Deduce el consumo de PTI de Extrusión según los metros de tela reportados, basado en los ratios de la receta
      let totalPtiDeductedKg = 0;
      const backflushRecords = [];

      for (const item of bom.items) {
        const ratio = Number(item.ratio_percentage || 50.0) / 100.0;
        const theoreticalKgForItem = numWeightKg * ratio;

        // Determinar qué Rack Maestro corresponde (Urdimbre o Trama)
        let targetRackId = null;
        if (item.role.toUpperCase() === 'URDIMBRE' && run.warp_rack_id) {
          targetRackId = run.warp_rack_id;
        } else if (item.role.toUpperCase() === 'TRAMA' && run.weft_rack_id) {
          targetRackId = run.weft_rack_id;
        } else {
          // Si no está diferenciado o falta uno, tomar el que esté montado
          targetRackId = run.warp_rack_id || run.weft_rack_id;
        }

        if (!targetRackId) {
          // Si el telar no tiene rack maestro asignado, buscamos cualquier rack con stock del PTI correspondiente
          const fallbackRack = await PtiRack.findOne({
            where: {
              current_quantity: { [Op.gt]: 0 },
            },
            order: [['updated_at', 'DESC']],
            transaction: t,
          });
          if (fallbackRack) targetRackId = fallbackRack.id;
        }

        if (targetRackId) {
          const rack = await PtiRack.findByPk(targetRackId, {
            lock: t.LOCK.UPDATE,
            transaction: t,
          });

          if (rack) {
            const unitWeightKg = Number(rack.unit_weight_kg) > 0 ? Number(rack.unit_weight_kg) : 6.8;
            const spoolsToDeduct = parseFloat((theoreticalKgForItem / unitWeightKg).toFixed(2));

            const balanceBefore = Number(rack.current_quantity);
            const balanceAfter = Math.max(0, parseFloat((balanceBefore - spoolsToDeduct).toFixed(2)));

            // Actualizar stock del Rack Maestro
            const newRackStatus = balanceAfter === 0 ? 'DISPONIBLE' : rack.status;
            await rack.update(
              {
                current_quantity: balanceAfter,
                status: newRackStatus,
              },
              { transaction: t }
            );

            // Registrar consumo Backflushing
            const consumptionEntry = await LoomBackflushConsumption.create(
              {
                viajero_roll_id: viajeroRoll.id,
                loom_run_id: run.id,
                rack_id: rack.id,
                pti_product_id: item.pti_product_id || rack.current_pti_type_id || 1,
                role: item.role,
                theoretical_kg: theoreticalKgForItem,
                spools_consumed: spoolsToDeduct,
                rack_balance_spools_before: balanceBefore,
                rack_balance_spools_after: balanceAfter,
              },
              { transaction: t }
            );
            backflushRecords.push(consumptionEntry);
            totalPtiDeductedKg += theoreticalKgForItem;
          }
        }
      }

      // 5. Actualizar Acumulados de la Corrida
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

      // 6. Registrar en Kardex de Enrutamiento
      await ViajeroRoutingLog.create(
        {
          viajero_roll_id: viajeroRoll.id,
          from_stage: 'NONE',
          to_stage: 'TELARES',
          area_id: 3, // TELARES
          operator_id: operator_id || run.operator_id,
          action: 'INGRESO_AREA',
          meters_in: 0,
          meters_out: numMeters,
          weight_in_kg: 0,
          weight_out_kg: numWeightKg,
          notes: notes || `Rollo producido en ${run.loom.name}`,
        },
        { transaction: t }
      );

      await t.commit();

      return {
        success: true,
        roll: viajeroRoll,
        backflush: backflushRecords,
        run_summary: {
          folio: run.folio,
          meters_produced: updatedMeters,
          rolls_count: updatedRollsCount,
        },
      };
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Validar escaneo de QR Viajero en estaciones (Globo, Laminado, Corte)
   * BLOQUEO ESTRICTO si el área no es la etapa válida siguiente
   */
  async validateViajeroScan({ qr_code, area_name, operator_id }) {
    const roll = await ViajeroRoll.findOne({
      where: { qr_code, is_active: true },
      include: [
        { model: Loom, as: 'loom' },
        { model: ProductionBom, as: 'bom' },
      ],
    });

    if (!roll) {
      return {
        is_allowed: false,
        error_code: 'ROLL_NOT_FOUND',
        message: `El código QR '${qr_code}' no corresponde a ningún Rollo Viajero registrado.`,
      };
    }

    const targetArea = area_name.trim().toUpperCase();
    const route = roll.route || [];

    // 1. Verificar si el área forma parte del ruteo autorizado de este rollo
    if (!route.includes(targetArea)) {
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: roll.current_stage,
        to_stage: targetArea,
        operator_id: operator_id || null,
        action: 'BLOQUEO_RUTEO_INVALIDO',
        notes: `Intento de escaneo no autorizado en ${targetArea}. Ruta oficial: ${route.join(' -> ')}`,
      });

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

    // 2. Verificar secuencia de pasos: ¿Es esta etapa la siguiente autorizada?
    if (roll.next_allowed_stage !== targetArea) {
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: roll.current_stage,
        to_stage: targetArea,
        operator_id: operator_id || null,
        action: 'BLOQUEO_RUTEO_INVALIDO',
        notes: `Intento de salto de etapa a ${targetArea}. Se requería antes: ${roll.next_allowed_stage}`,
      });

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

    // 3. Etapa válida y autorizada
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
   * Procesar el rollo en la estación destino (Globo, Laminado, Corte) y avanzar la ruta
   */
  async processViajeroStage({ qr_code, target_stage, operator_id, meters_in, meters_out, weight_in_kg, weight_out_kg, notes }) {
    const t = await sequelize.transaction();
    try {
      const validation = await this.validateViajeroScan({ qr_code, area_name: target_stage, operator_id });
      if (!validation.is_allowed) {
        throw new Error(validation.message);
      }

      const roll = await ViajeroRoll.findOne({
        where: { qr_code, is_active: true },
        transaction: t,
      });

      const route = roll.route;
      const normalizedTarget = target_stage.trim().toUpperCase();
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

      // Determinar ID del área
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
   * Obtener detalle completo de un Rollo Viajero (Trazabilidad Genética + Historial de Ruta)
   */
  async getViajeroDetails(qr_code) {
    const roll = await ViajeroRoll.findOne({
      where: { qr_code },
      include: [
        { model: Loom, as: 'loom' },
        { model: ProductionBom, as: 'bom' },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username'] },
        {
          model: LoomBackflushConsumption,
          as: 'consumptions',
          include: [
            { model: PtiRack, as: 'rack' },
            { model: PtiProduct, as: 'ptiProduct' },
          ],
        },
        {
          model: ViajeroRoutingLog,
          as: 'routingLogs',
          include: [{ model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name'] }],
        },
      ],
    });

    if (!roll) return null;
    return roll;
  }
}

module.exports = new TelaresService();
