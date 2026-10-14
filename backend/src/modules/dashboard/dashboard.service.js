const { ProcessRun, ProcessRunOutput, ProcessRunInput, MaterialStock, Material, ScrapMovement } = require('../../database/models');
const { Op } = require('sequelize');
const DashboardMapper = require('./dashboard.mapper');

class DashboardService {
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
      const currentInventoryValue = Number(currentInventoryResult?.get('currentValue') || 0);

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

      const inventoryByAreaGraph = inventoryByAreaQuery.map(item => ({
        name: item.areaName || 'Sin Área',
        value: Number(item.value || 0)
      }));

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
            investmentVsLoss: investmentVsLossGraph,
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
