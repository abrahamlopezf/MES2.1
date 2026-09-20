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
      const prodSum = await ProcessRunOutput.sum('quantity_secondary') || 0;
      const productionTotal = Number(prodSum);

      // 3. Total Input (quantity_used)
      const inputSum = await ProcessRunInput.sum('quantity_used') || 0;
      const totalInput = Number(inputSum);

      // 4. Active Runs
      const dbActiveRuns = await ProcessRun.findAll({
        where: { status: 'RUNNING' },
        limit: 5,
        attributes: ['id', 'folio', 'target_quantity']
      });
      const activeRuns = dbActiveRuns.map(r => ({
        id: r.id,
        code: r.folio,
        total_output: Number(r.target_quantity || 0)
      }));
      const lowStockAlerts = [];
      
      // 5. Yield Data (Ultimos 7 dias de producción real)
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
      
      const yieldData = outputsByDate.reverse().map(o => ({
         name: o.dateStr,
         dateStr: o.dateStr,
         entradas: 0, // Podriamos sumar inputs por fecha tambien
         salidas: Number(o.salidas || 0)
      }));
      
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
      console.error('Error in DashboardService:', error);
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

      // 3. Total Perdido por Scrap
      const totalScrapResult = await InventoryMovement.sum('total_cost', {
        where: { type: 'SCRAP' }
      });
      const totalLostScrap = Number(totalScrapResult || 0);

      // 4. Total Perdido por Merma
      const totalMermaResult = await InventoryMovement.sum('total_cost', {
        where: { type: 'MERMA' }
      });
      const totalLostMerma = Number(totalMermaResult || 0);

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

      return {
        success: true,
        data: {
          kpis: {
            totalInvested,
            currentInventoryValue,
            totalLostScrap,
            totalLostMerma
          },
          charts: {
            inventoryByArea: inventoryByAreaGraph,
            investmentVsLoss: investmentVsLossGraph
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
