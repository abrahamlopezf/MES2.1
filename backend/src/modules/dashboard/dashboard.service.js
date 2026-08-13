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
      // Mock data para KPIs
      const productionTotal = 4250;
      const totalInput = 4600;
      const scrapTotal = 142;
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
}

module.exports = DashboardService;
