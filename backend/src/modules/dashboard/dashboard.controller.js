const DashboardService = require('./dashboard.service');

class DashboardController {
  static async getAreaOperationsOverview(req, res) {
    try {
      const areas = await DashboardService.getAreaOperationsOverview(req.user);
      return res.status(200).json({ success: true, data: areas });
    } catch (error) {
      console.error('[DashboardController] Area overview error:', error);
      return res.status(500).json({ success: false, message: 'No se pudo consultar el resumen operativo de áreas.' });
    }
  }

  static async getOperationsDashboard(req, res) {
    try {
      const payload = await DashboardService.getOperationsDashboard();
      
      return res.status(200).json({
        success: true,
        message: payload
      });
    } catch (error) {
      console.error('[DashboardController] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al consultar estado operativo'
      });
    }
  }

  static async getFinancialDashboard(req, res) {
    try {
      const payload = await DashboardService.getFinancialDashboard();
      
      return res.status(200).json(payload);
    } catch (error) {
      console.error('[DashboardController] Financial Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al consultar estado financiero'
      });
    }
  }
}

module.exports = DashboardController;
