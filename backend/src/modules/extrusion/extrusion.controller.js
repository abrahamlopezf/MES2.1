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
}

module.exports = new ExtrusionController();
