const DashboardService = require('./dashboard.service');

class DashboardController {
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
}

module.exports = DashboardController;
