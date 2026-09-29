const { sequelize, ProcessFormula, ProcessFormulaItem, ProcessPreparation, ProcessPreparationInput, WipInventory, QrCode, TraceabilityEvent, Lote, Area } = require('../../database/models');

class ExtrusionService {
  async mixFormula(payload, userId) {
    return sequelize.transaction(async (transaction) => {
      const { formula_id, destination_qr_code, inputs, area_id, notes } = payload;

      // 1. Validar Fórmula
      const formula = await ProcessFormula.findByPk(formula_id, { transaction });
      if (!formula || !formula.is_active) {
        throw new Error('Fórmula no válida o inactiva.');
      }

      // 2. Validar QR Destino
      const destQr = await QrCode.findOne({ where: { qr_code: destination_qr_code }, transaction });
      if (!destQr || destQr.status !== 'GENERATED') {
        throw new Error('El código QR de destino no existe o ya está en uso.');
      }

      // 3. Generar Folio
      const folio = `MIX-EXT-${Date.now()}`;
      let totalQuantity = 0;

      const preparation = await ProcessPreparation.create({
        folio,
        formula_id,
        from_area_id: area_id,
        to_area_id: area_id,
        destination_qr_code_id: destQr.id,
        total_quantity: 0,
        unit: 'KG',
        status: 'PREPARADA',
        notes,
        prepared_by: userId,
        prepared_at: new Date()
      }, { transaction });

      // 4. Procesar Entradas (WIP)
      for (const input of inputs) {
        const sourceQr = await QrCode.findOne({ where: { qr_code: input.qr_code }, transaction });
        if (!sourceQr) throw new Error(`QR ${input.qr_code} no encontrado.`);

        const wipItem = await WipInventory.findOne({
          where: { qr_code_id: sourceQr.id, area_id },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!wipItem) {
          throw new Error(`El material con QR ${input.qr_code} no se encuentra en el WIP de Extrusión.`);
        }

        if (Number(wipItem.amount) < Number(input.quantity)) {
          throw new Error(`Cantidad insuficiente en el QR ${input.qr_code}. Disponible: ${wipItem.amount}.`);
        }

        // Descontar
        const newAmount = Number(wipItem.amount) - Number(input.quantity);
        wipItem.amount = newAmount;
        await wipItem.save({ transaction });

        totalQuantity += Number(input.quantity);

        // Crear registro en ProcessPreparationInput
        await ProcessPreparationInput.create({
          preparation_id: preparation.id,
          source_qr_code_id: sourceQr.id,
          material_id: wipItem.material_id,
          quantity: input.quantity,
          unit: 'KG',
          balance_before: Number(wipItem.amount) + Number(input.quantity),
          balance_after: newAmount,
        }, { transaction });

        // Trazabilidad Consumo
        const isDepleted = newAmount === 0;
        if (isDepleted) {
          await sourceQr.update({ status: 'CONSUMED', is_active: false }, { transaction });
        }

        await TraceabilityEvent.create({
          qr_code_id: sourceQr.id,
          event_type: 'CONSUMO_MEZCLA',
          entity_type: 'ProcessPreparation',
          entity_id: preparation.id.toString(),
          from_status: isDepleted ? 'IN_WIP' : 'IN_WIP',
          to_status: isDepleted ? 'CONSUMED' : 'IN_WIP',
          performed_by: userId,
          notes: `Consumido para la mezcla ${folio}`,
          metadata: { preparation_id: preparation.id, consumed_amount: input.quantity, remaining: newAmount }
        }, { transaction });
      }

      // 5. Actualizar Totales
      preparation.total_quantity = totalQuantity;
      await preparation.save({ transaction });

      // 6. Actualizar QR Destino (La mezcla está en el piso de Extrusión, en un carrito o silo)
      await destQr.update({
        status: 'EN_USO', // Es un lote de mezcla activo
        assigned_area_id: area_id,
      }, { transaction });

      await TraceabilityEvent.create({
        qr_code_id: destQr.id,
        event_type: 'GENERACION_MEZCLA',
        entity_type: 'ProcessPreparation',
        entity_id: preparation.id.toString(),
        from_status: 'GENERATED',
        to_status: 'EN_USO',
        performed_by: userId,
        notes: `Mezcla generada. Folio: ${folio}, Fórmula: ${formula.name}`,
        metadata: { preparation_id: preparation.id, total_quantity: totalQuantity }
      }, { transaction });

      // 7. Crear el Lote correspondiente a la Mezcla
      // Para que la Extrusora pueda consumir esta mezcla en su Corrida de Producción.
      const lote = await Lote.create({
        material_id: 1, // Generic mix material id for now or could be targeted from formula
        folio,
        user_id: userId,
        qr_id: destQr.id,
        location_id: null,
        initial_amount: totalQuantity,
        available_amount: totalQuantity,
        notes: 'Lote de Mezcla generado en Extrusión',
        is_active: true
      }, { transaction });

      return preparation;
    });
  }

  async getFormulas() {
    return ProcessFormula.findAll({
      where: { is_active: true }
    });
  }

  async getFormulaDetails(id) {
    const formula = await ProcessFormula.findByPk(id);
    if (!formula) throw new Error('Fórmula no encontrada.');

    const items = await ProcessFormulaItem.findAll({ where: { formula_id: id } });
    
    // As a workaround since relations might not be fully mapped to Material in index.js for ProcessFormulaItem
    const { Material } = require('../../database/models');
    
    const detailedItems = [];
    for (const item of items) {
       const mat = await Material.findByPk(item.material_id);
       detailedItems.push({
         ...item.toJSON(),
         material_name: mat ? mat.name : 'Desconocido'
       });
    }

    return {
      ...formula.toJSON(),
      items: detailedItems
    };
  }
}

module.exports = new ExtrusionService();
