const reportsService = require('./reports.service');

class ReportsController {
  async getInventory(req, res, next) {
    try {
      const data = await reportsService.getInventoryReport(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getPurchases(req, res, next) {
    try {
      const data = await reportsService.getPurchasesReport(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getYield(req, res, next) {
    try {
      const data = await reportsService.getYieldReport(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getScrap(req, res, next) {
    try {
      const data = await reportsService.getScrapReport(req.query);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getTraceability(req, res, next) {
    try {
      const { qrCodeId } = req.params;
      const data = await reportsService.getTraceabilityTree(qrCodeId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportsController();
