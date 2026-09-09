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
      // Obtener datos reales de Merma/Scrap desde la base de datos
      const { InventoryMovement } = require('../../database/models');
      const scrapSum = await InventoryMovement.sum('quantity_change', {
        where: { type: { [Op.in]: ['MERMA', 'SCRAP'] } }
      });
      const realScrapTotal = scrapSum ? Math.abs(scrapSum) : 0;

      // Mock data para KPIs
      const productionTotal = 4250;
      const totalInput = 4600;
      const scrapTotal = realScrapTotal;
      const activeRuns = [
        { id: 1, code: 'RUN-EXT-001', total_output: 1200 },
        { id: 2, code: 'RUN-EXT-002', total_output: 800 },
      ];
      const lowStockAlerts = [];
      
      // Mock Data para Gráficas
      const yieldData = [
        { name: 'Lun', entradas: 800, salidas: 760, dateStr: '2023-10-01' },
        { name: 'Mar', entradas: 650, salidas: 610, dateStr: '2023-10-02' },
        { name: 'Mie', entradas: 900, salidas: 870, dateStr: '2023-10-03' },
        { name: 'Jue', entradas: 400, salidas: 380, dateStr: '2023-10-04' },
        { name: 'Vie', entradas: 750, salidas: 710, dateStr: '2023-10-05' },
        { name: 'Sab', entradas: 300, salidas: 280, dateStr: '2023-10-06' },
      ];
      
      const scrapData = [
        { area: 'Mezclado', kg: 45 },
        { area: 'Extrusión', kg: 85 },
        { area: 'Telares', kg: 12 },
      ];

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
