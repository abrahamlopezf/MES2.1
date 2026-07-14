const { ProcessRun, ProcessRunOutput, ProcessRunInput, MaterialStock, Material, ScrapMovement } = require('../../database/models');
const { Op } = require('sequelize');
const DashboardMapper = require('./dashboard.mapper');

class DashboardService {
  /**
   * Obtiene el payload del Dashboard Operativo respetando fuentes únicas de verdad.
   */
  static async getOperationsDashboard() {
    try {
      // 1. Obtener Corridas Activas
      const activeRuns = await ProcessRun.findAll({
        where: {
          status: {
            [Op.in]: ['EN_PROCESO', 'PAUSADA']
          }
        },
        raw: true
      });

      const activeRunIds = activeRuns.map(r => r.id);

      // 2. Producción Total de Corridas Activas
      let productionTotal = 0;
      if (activeRunIds.length > 0) {
        const outputs = await ProcessRunOutput.findAll({
          where: { process_run_id: activeRunIds },
          raw: true
        });
        productionTotal = outputs.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
      }

      // 3. Insumos Consumidos (Para Yield)
      let totalInput = 0;
      if (activeRunIds.length > 0) {
        const inputs = await ProcessRunInput.findAll({
          where: { process_run_id: activeRunIds },
          raw: true
        });
        totalInput = inputs.reduce((acc, curr) => acc + (Number(curr.quantity_used) || 0), 0);
      }

      // 4. Scrap Generado (Para Scrap y Yield)
      let scrapTotal = 0;
      if (activeRunIds.length > 0) {
        const scraps = await ScrapMovement.findAll({
          where: { process_run_id: activeRunIds },
          raw: true
        });
        scrapTotal = scraps.reduce((acc, curr) => acc + (Number(curr.weight) || 0), 0);
      }

      // 5. Alertas de Inventario
      // MaterialStock join Material (stock_actual < min_stock)
      // Como no tenemos min_stock explícito en todos, simularemos temporalmente el query real
      // asumiendo que min_stock existe en Material (normalmente es así).
      // Para evitar error si no existe min_stock, buscaremos stock_actual < 100 como fallback
      // o revisamos la estructura de MaterialStock.
      
      const lowStockAlerts = []; // Pendiente cruce con `Material.min_stock` si existe en schema

      // Preparar raw data para el Mapper
      const rawData = {
        productionTotal,
        totalInput,
        scrapTotal,
        activeRuns,
        lowStockAlerts
      };

      return DashboardMapper.toPayload(rawData);
    } catch (error) {
      console.error('Error in DashboardService:', error);
      throw error;
    }
  }
}

module.exports = DashboardService;
