const { ProcessRun, ProcessRunOutput, ProcessRunInput, MaterialStock, Material, ScrapMovement } = require('../../database/models');
const { Op } = require('sequelize');
const DashboardMapper = require('./dashboard.mapper');

class DashboardService {
  static async getAreaOperationsOverview(currentUser) {
    const readSafely = async (load, map) => {
      try {
        return map(await load());
      } catch (error) {
        console.warn('[DashboardService] No se pudo resumir un área:', error.message);
        return { available: false };
      }
    };

    const [extrusion, telares, globo, laminado] = await Promise.all([
      readSafely(
        () => require('../extrusion/extrusion.service').getExtrusionWip({ includeFinancials: false }),
        (wip) => ({ available: true, wip_kg: wip.total_kg, material_items: wip.items.length, mixtures_kg: wip.mixtures_total_kg, active_mixtures: wip.mixtures.length })
      ),
      readSafely(
        () => require('../telares/telares.service').getWipSummary(currentUser),
        (wip) => ({ available: true, ...wip.macro })
      ),
      readSafely(
        () => require('../globo/globo.service').getWipSummary(currentUser),
        (wip) => ({
          available: true,
          rolls_in_floor: wip.macro.total_rolls_in_floor,
          rolls_incoming: wip.macro.total_rolls_incoming,
          meters_in_floor: wip.macro.total_meters_in_floor,
          fabric_kg: wip.macro.total_weight_fabric_kg,
          materials_kg: wip.macro.total_warehouse_materials_kg,
          transformed_recently: wip.recent_transformed.length,
        })
      ),
      readSafely(
        () => require('../laminado/laminado.service').getWipSummary(currentUser),
        (wip) => ({
          available: true,
          rolls_in_floor: wip.macro.total_rolls_in_floor,
          rolls_incoming: wip.macro.total_rolls_incoming,
          meters_in_floor: wip.macro.total_meters_in_floor,
          fabric_kg: wip.macro.total_weight_fabric_kg,
          materials_kg: wip.macro.total_warehouse_materials_kg,
          transformed_recently: wip.recent_transformed.length,
        })
      ),
    ]);

    return { extrusion, telares, globo, laminado, refreshed_at: new Date().toISOString() };
  }

  /**
   * Obtiene el payload del Dashboard Operativo.
   * NOTA: Actualmente se está utilizando MOCK DATA porque los modelos 
   * (ProcessRun, ScrapMovement) aún no están definidos en la base de datos (Fase 3/4).
   */
  static async getOperationsDashboard() {
    try {
      const { InventoryMovement, ProcessRun, ProcessRunOutput, ProcessRunInput, sequelize } = require('../../database/models');
      
      // 1. Scrap/Merma Total
      const scrapSum = await InventoryMovement.sum('quantity_change', {
        where: { type: { [Op.in]: ['MERMA', 'SCRAP'] } }
      });
      const scrapTotal = scrapSum ? Math.abs(scrapSum) : 0;

      // 2. Production Total (quantity_secondary assumed to be KG)
      let productionTotal = 0;
      if (ProcessRunOutput && typeof ProcessRunOutput.sum === 'function') {
        const prodSum = await ProcessRunOutput.sum('quantity_secondary') || 0;
        productionTotal = Number(prodSum);
      }

      // 3. Total Input (quantity_used)
      let totalInput = 0;
      if (ProcessRunInput && typeof ProcessRunInput.sum === 'function') {
        const inputSum = await ProcessRunInput.sum('quantity_used') || 0;
        totalInput = Number(inputSum);
      }

      // 4. Active Runs
      let activeRuns = [];
      if (ProcessRun && typeof ProcessRun.findAll === 'function') {
        const dbActiveRuns = await ProcessRun.findAll({
          where: { status: 'RUNNING' },
          limit: 5,
          attributes: ['id', 'folio', 'target_quantity']
        });
        activeRuns = dbActiveRuns.map(r => ({
          id: r.id,
          code: r.folio,
          total_output: Number(r.target_quantity || 0)
        }));
      }
      const lowStockAlerts = [];
      
      // 5. Yield Data (Ultimos 7 dias de producción real)
      let yieldData = [];
      if (ProcessRunOutput && typeof ProcessRunOutput.findAll === 'function') {
        const outputsByDate = await ProcessRunOutput.findAll({
          attributes: [
            [sequelize.fn('DATE', sequelize.col('produced_at')), 'dateStr'],
            [sequelize.fn('SUM', sequelize.col('quantity_secondary')), 'salidas']
          ],
          group: [sequelize.fn('DATE', sequelize.col('produced_at'))],
          order: [[sequelize.fn('DATE', sequelize.col('produced_at')), 'DESC']],
          limit: 7,
          raw: true
        });
        
        yieldData = outputsByDate.reverse().map(o => ({
           name: o.dateStr,
           dateStr: o.dateStr,
           entradas: 0,
           salidas: Number(o.salidas || 0)
        }));
      }
      
      // 6. Scrap Data (Ultimos 7 dias)
      const scrapByArea = await InventoryMovement.findAll({
        where: { type: { [Op.in]: ['MERMA', 'SCRAP'] } },
        attributes: [
          'type',
          [sequelize.fn('SUM', sequelize.col('quantity_change')), 'kg']
        ],
        group: ['type'],
        raw: true
      });

      const scrapData = scrapByArea.map(s => ({
        area: s.type,
        kg: Math.abs(Number(s.kg || 0))
      }));

      const rawData = {
        productionTotal,
        totalInput,
        scrapTotal,
        activeRuns,
        lowStockAlerts,
        yieldData,
        scrapData
      };

      return DashboardMapper.toPayload(rawData);
    } catch (error) {
      console.error('Error in DashboardService.getOperationsDashboard:', error);
      throw error;
    }
  }

  /**
   * Obtiene el payload del Dashboard Financiero Ejecutivo
   */
  static async getFinancialDashboard() {
    try {
      const { Lote, InventoryMovement, Location, Area } = require('../../database/models');
      const { sequelize } = require('../../config/database');

      // 1. Total Invertido
      const totalInvestedResult = await Lote.findOne({
        attributes: [
          [sequelize.literal('SUM(initial_amount * COALESCE(unit_cost, 0))'), 'totalInvested']
        ]
      });
      const totalInvested = Number(totalInvestedResult?.get('totalInvested') || 0);

      // 2. Inventario Actual en Dinero
      const currentInventoryResult = await Lote.findOne({
        where: { is_active: true },
        attributes: [
          [sequelize.literal('SUM(available_amount * COALESCE(unit_cost, 0))'), 'currentValue']
        ]
      });
      const warehouseInventoryValue = Number(currentInventoryResult?.get('currentValue') || 0);
      const [wipInventoryValueRows] = await sequelize.query(`
        SELECT COALESCE(SUM(w.amount * COALESCE(l.unit_cost, 0)), 0) AS value
        FROM wip_inventories w
        JOIN materials m ON m.id = w.material_id
        JOIN lotes l ON l.id = w.lote_id
        WHERE m.family_id = 43 OR COALESCE(m.internal_code, '') LIKE 'MP-%'
      `);
      const wipInventoryValue = Number(wipInventoryValueRows[0]?.value || 0);
      const currentInventoryValue = warehouseInventoryValue + wipInventoryValue;

      // 3. Pérdidas desglosadas por Merma, Scrap y Bajas (Cálculo exacto alineado con Almacén)
      const [lossBreakdownResult] = await sequelize.query(`
        SELECT 
          SUM(CASE WHEN type = 'MERMA' THEN COALESCE(NULLIF(total_cost, 0), ABS(quantity_change) * COALESCE(unit_cost, 0)) ELSE 0 END) as merma_loss,
          SUM(CASE WHEN type = 'SCRAP' THEN COALESCE(NULLIF(total_cost, 0), ABS(quantity_change) * COALESCE(unit_cost, 0)) ELSE 0 END) as scrap_loss,
          SUM(CASE WHEN type IN ('BAJA', 'DISPOSE') THEN COALESCE(NULLIF(total_cost, 0), ABS(quantity_change) * COALESCE(unit_cost, 0)) ELSE 0 END) as baja_loss
        FROM inventory_movements 
        WHERE type IN ('MERMA', 'SCRAP', 'BAJA', 'DISPOSE')
      `);
      const totalLostMerma = Number(lossBreakdownResult[0]?.merma_loss || 0);
      const totalLostScrap = Number(lossBreakdownResult[0]?.scrap_loss || 0);
      const totalLostBaja = Number(lossBreakdownResult[0]?.baja_loss || 0);
      const totalLoss = totalLostMerma + totalLostScrap + totalLostBaja;

      // 5. Inventario por Área
      const inventoryByAreaQuery = await Lote.findAll({
        where: { is_active: true },
        attributes: [
          [sequelize.col('location.area.name'), 'areaName'],
          [sequelize.literal('SUM(available_amount * COALESCE("Lote"."unit_cost", 0))'), 'value']
        ],
        include: [{
          model: Location,
          as: 'location',
          attributes: [],
          include: [{
            model: Area,
            as: 'area',
            attributes: []
          }]
        }],
        group: ['location->area.id', 'location->area.name'],
        raw: true
      });

      const inventoryValueByArea = new Map(inventoryByAreaQuery.map(item => [
        item.areaName || 'Sin Área',
        Number(item.value || 0),
      ]));
      const [wipByAreaRows] = await sequelize.query(`
        SELECT COALESCE(a.name, 'Sin Área') AS name,
          COALESCE(SUM(w.amount * COALESCE(l.unit_cost, 0)), 0) AS value
        FROM wip_inventories w
        JOIN materials m ON m.id = w.material_id
        JOIN lotes l ON l.id = w.lote_id
        LEFT JOIN areas a ON a.id = w.area_id
        WHERE m.family_id = 43 OR COALESCE(m.internal_code, '') LIKE 'MP-%'
        GROUP BY a.id, a.name
      `);
      for (const item of wipByAreaRows) {
        const name = item.name || 'Sin Área';
        inventoryValueByArea.set(name, (inventoryValueByArea.get(name) || 0) + Number(item.value || 0));
      }
      const inventoryByAreaGraph = [...inventoryValueByArea].map(([name, value]) => ({ name, value }));

      // Los consumibles se cargan al área al surtirse y no reciben índice de transformación.
      const [directExpensesByAreaRows] = await sequelize.query(`
        SELECT COALESCE(a.name, 'Sin Área') AS name,
          COALESCE(SUM(COALESCE(NULLIF(im.total_cost, 0), ABS(im.quantity_change) * COALESCE(im.unit_cost, 0))), 0) AS value
        FROM inventory_movements im
        LEFT JOIN areas a ON a.id = im.area_id
        WHERE im.type = 'CONSUMPTION' AND im.cost_treatment = 'DIRECT_EXPENSE'
        GROUP BY a.id, a.name
        ORDER BY value DESC
      `);
      const directExpensesByAreaGraph = directExpensesByAreaRows.map(item => ({ name: item.name, value: Number(item.value || 0) }));

      // 6. Pérdidas por Área (Merma)
      const mermaByAreaQuery = await InventoryMovement.findAll({
        where: { type: 'MERMA' },
        attributes: [
          [sequelize.col('fromLocation.area.name'), 'areaName'],
          [sequelize.literal('SUM(total_cost)'), 'value']
        ],
        include: [{
          model: Location,
          as: 'fromLocation',
          attributes: [],
          include: [{
            model: Area,
            as: 'area',
            attributes: []
          }]
        }],
        group: ['fromLocation->area.id', 'fromLocation->area.name'],
        raw: true
      });

      const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6'];
      const investmentVsLossGraph = mermaByAreaQuery.map((item, index) => ({
        name: `${item.areaName || 'Sin Área'} (Merma)`,
        value: Number(item.value || 0),
        color: colors[index % colors.length]
      }));

      // Si no hay merma, mostrar un array vacío o el resumen general
      if (investmentVsLossGraph.length === 0) {
        investmentVsLossGraph.push({ name: 'Sin Pérdidas', value: 0, color: '#f59e0b' });
      }

      // Obtener métricas detalladas del almacén para sincronización ejecutiva
      let warehouseMetrics = null;
      try {
        const warehouseService = require('../warehouse/warehouse.service');
        warehouseMetrics = await warehouseService.getDashboardMetrics();
      } catch (wErr) {
        console.warn('Advertencia al consultar warehouse metrics:', wErr.message);
      }

      // Obtener tendencias mensuales financieras reales de almacén y operaciones
      let monthlyFinancialTrends = [];
      try {
        const warehouseReportService = require('../warehouse/warehouseReport.service');
        const currentYear = new Date().getFullYear();
        const reportData = await warehouseReportService.getMonthlyReport({ year: currentYear, month: 'all' });
        monthlyFinancialTrends = (reportData.monthlyTrends || []).map(t => ({
          mes: t.monthName,
          inventario: t.entriesCost,
          operativo: t.consumptionsCost,
          merma: t.wasteCost
        }));
      } catch (trendErr) {
        console.warn('Advertencia al consultar tendencias mensuales:', trendErr.message);
      }

      return {
        success: true,
        data: {
          kpis: {
            totalInvested,
            currentInventoryValue,
            totalLoss,
            totalLostScrap,
            totalLostMerma,
            totalLostBaja,
            totalEntradas: warehouseMetrics?.totalEntradas ?? 0,
            bajasRegistradas: warehouseMetrics?.bajasRegistradas ?? 0,
            materialesStockBajo: warehouseMetrics?.materialesStockBajo ?? 0,
            mermaRegistrada: warehouseMetrics?.mermaRegistrada ?? 0,
            mermaQty: warehouseMetrics?.financial?.mermaQty ?? 0,
            scrapQty: warehouseMetrics?.financial?.scrapQty ?? 0,
            bajaQty: warehouseMetrics?.financial?.bajaQty ?? 0,
            totalLossQty: warehouseMetrics?.financial?.totalLossQty ?? 0,
          },
          charts: {
            inventoryByArea: inventoryByAreaGraph,
            directExpensesByArea: directExpensesByAreaGraph,
            investmentVsLoss: investmentVsLossGraph,
            monthlyFinancial: monthlyFinancialTrends,
            warehouseChartData: warehouseMetrics?.chartData || [],
            warehouseMermaData: warehouseMetrics?.mermaData || [],
            warehousePieData: warehouseMetrics?.pieData || []
          }
        }
      };
    } catch (error) {
      console.error('Error in DashboardService.getFinancialDashboard:', error);
      throw error;
    }
  }
}

module.exports = DashboardService;
