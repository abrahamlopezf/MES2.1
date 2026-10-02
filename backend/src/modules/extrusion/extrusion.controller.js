const extrusionService = require('./extrusion.service');

class ExtrusionController {
  async mixFormula(req, res, next) {
    try {
      // payload needs: formula_id, destination_qr_code, inputs: [{qr_code, quantity}]
      const result = await extrusionService.mixFormula({
        ...req.body,
        area_id: req.user.area_id
      }, req.user.id);

      return res.status(201).json({
        success: true,
        message: 'Mezcla generada exitosamente.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getFormulas(req, res, next) {
    try {
      const formulas = await extrusionService.getFormulas();
      return res.status(200).json({
        success: true,
        data: formulas
      });
    } catch (error) {
      next(error);
    }
  }

  async getFormulaDetails(req, res, next) {
    try {
      const formula = await extrusionService.getFormulaDetails(req.params.id);
      return res.status(200).json({
        success: true,
        data: formula
      });
    } catch (error) {
      next(error);
    }
  }

  async createMixRequest(req, res, next) {
    try {
      const preparation = await extrusionService.createMixRequest(req.body, req.user.id);
      return res.status(201).json({
        success: true,
        message: 'Solicitud de mezcla creada',
        data: preparation
      });
    } catch (error) {
      next(error);
    }
  }

  async getMixRequests(req, res, next) {
    try {
      const status = req.query.status || 'SOLICITADA';
      const requests = await extrusionService.getMixRequests(status);
      return res.status(200).json({
        success: true,
        data: requests
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExtrusionController();
