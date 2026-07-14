const { sequelize, MaterialStock, MaterialLot, IntermediateStock, TraceableItem, ScrapMovement, ProcessRun, ProcessPreparation, TraceabilityLink, TraceabilityMovement, Material } = require('../../database/models');
const { Op } = require('sequelize');

class ReportsService {

  // 1. Inventario General (Materia Prima, Material Intermedio, Producto Terminado)
  async getInventoryReport(filters = {}) {
    // Materia Prima
    const rawMaterials = await MaterialStock.findAll({
      include: [{ model: Material, as: 'material', attributes: ['code', 'name', 'material_type'] }]
    });

    // Material Intermedio (Carretes)
    const intermediateMaterials = await IntermediateStock.findAll({
      where: { quantity_primary: { [Op.gt]: 0 } }
    });

    // Producto Terminado (Rollos, etc) - Podemos consultar los TraceableItems que están en almacén de PT
    const finishedGoods = await TraceableItem.findAll({
      where: {
        item_type: 'FINAL_ROLL',
        quantity_current: { [Op.gt]: 0 }
      }
    });

    return {
      raw_materials: rawMaterials.map(m => ({
        material_id: m.material_id,
        code: m.material.code,
        name: m.material.name,
        type: m.material.material_type,
        total_quantity: m.total_quantity,
        current_quantity: m.current_quantity,
        available_quantity: m.available_quantity,
        unit: m.default_unit
      })),
      intermediate_materials: intermediateMaterials.map(m => ({
        stock_id: m.id,
        intermediate_material_id: m.intermediate_material_id,
        rack_id: m.rack_id,
        quantity_primary: m.quantity_primary,
        unit: m.primary_unit
      })),
      finished_goods: finishedGoods.map(fg => ({
        traceable_item_id: fg.id,
        qr_code_id: fg.qr_code_id,
        quantity: fg.quantity_current,
        unit: fg.unit,
        status: fg.status
      }))
    };
  }

  // 2. Historial de Entradas (Compras / Recepciones)
  async getPurchasesReport(filters = {}) {
    const { startDate, endDate } = filters;
    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.received_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    } else if (startDate) {
      whereClause.received_at = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      whereClause.received_at = { [Op.lte]: new Date(endDate) };
    }

    const lots = await MaterialLot.findAll({
      where: whereClause,
      include: [{ model: Material, as: 'material', attributes: ['code', 'name', 'material_type'] }],
      order: [['received_at', 'DESC']]
    });

    let totalVolume = 0;
    const details = lots.map(lot => {
      totalVolume += Number(lot.received_quantity);
      return {
        lot_id: lot.id,
        material_code: lot.material.code,
        material_name: lot.material.name,
        material_type: lot.material.material_type,
        supplier_lot: lot.supplier_lot,
        received_quantity: lot.received_quantity,
        unit: lot.unit,
        received_at: lot.received_at
      };
    });

    return {
      summary: { total_purchased_volume: totalVolume },
      details
    };
  }

  // 3. Rendimiento de Producción (Yield)
  async getYieldReport(filters = {}) {
    const { startDate, endDate } = filters;
    
    const preparationWhere = {};
    const processRunWhere = {};
    
    if (startDate && endDate) {
      preparationWhere.created_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
      processRunWhere.created_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    } else if (startDate) {
      preparationWhere.created_at = { [Op.gte]: new Date(startDate) };
      processRunWhere.created_at = { [Op.gte]: new Date(startDate) };
    }

    // Mezclas Preparadas
    const preparations = await ProcessPreparation.findAll({ where: preparationWhere });
    const totalMixKg = preparations.reduce((sum, p) => sum + Number(p.total_quantity || 0), 0);

    // Corridas de Producción (Extrusión y Telares)
    const processRuns = await ProcessRun.findAll({ where: processRunWhere });
    const extrusionRuns = processRuns.filter(r => r.process_area_id === 2); // Asumiendo ID 2 = Producción/Extrusión
    const loomsRuns = processRuns.filter(r => r.process_area_id === 3);     // Asumiendo ID 3 = Telares

    return {
      summary: {
        total_mix_prepared_kg: totalMixKg,
        extrusion_runs_count: extrusionRuns.length,
        looms_runs_count: loomsRuns.length,
      },
      details: {
        preparations: preparations.map(p => ({ folio: p.folio, quantity: p.total_quantity, unit: p.unit, date: p.created_at })),
        extrusion: extrusionRuns.map(r => ({ folio: r.folio, status: r.status, started_at: r.started_at })),
        looms: loomsRuns.map(r => ({ folio: r.folio, status: r.status, started_at: r.started_at })),
      }
    };
  }

  // 4. Reporte de Mermas (Scrap)
  async getScrapReport(filters = {}) {
    const { startDate, endDate, areaId } = filters;
    const whereClause = { movement_type: 'GENERACION' };
    
    if (startDate && endDate) {
      whereClause.created_at = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    } else if (startDate) {
      whereClause.created_at = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      whereClause.created_at = { [Op.lte]: new Date(endDate) };
    }

    // Nota: El modelo ScrapMovement asocia un container que a su vez está en un Rack/Área. 
    // Por simplicidad calculamos el volumen total de generación directa.
    const movements = await ScrapMovement.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    const totalGenerated = movements.reduce((sum, m) => sum + Number(m.quantity || 0), 0);

    return {
      summary: { total_scrap_generated: totalGenerated },
      movements: movements.map(m => ({
        id: m.id,
        container_id: m.container_id,
        quantity: m.quantity,
        notes: m.notes,
        date: m.created_at
      }))
    };
  }

  // 5. Árbol de Trazabilidad (Genealogía)
  async getTraceabilityTree(qrCodeId) {
    if (!qrCodeId) throw new Error('Se requiere el ID del Código QR para la trazabilidad.');

    // Obtenemos los padres de este QR iterativamente
    const parents = await TraceabilityLink.findAll({
      where: { child_qr_code_id: qrCodeId }
    });

    // Obtenemos los hijos de este QR iterativamente
    const children = await TraceabilityLink.findAll({
      where: { parent_qr_code_id: qrCodeId }
    });

    return {
      target_qr_id: qrCodeId,
      parents: parents.map(p => ({
        parent_qr_id: p.parent_qr_code_id,
        link_type: p.link_type,
        quantity_used: p.quantity_used,
        unit: p.unit,
        date: p.created_at
      })),
      children: children.map(c => ({
        child_qr_id: c.child_qr_code_id,
        link_type: c.link_type,
        quantity_generated: c.quantity_generated,
        unit: c.unit,
        date: c.created_at
      }))
    };
  }
}

module.exports = new ReportsService();
