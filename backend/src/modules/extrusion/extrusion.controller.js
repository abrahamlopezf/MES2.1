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

  // ==========================================
  // PISO DE EXTRUSIÓN & CONTROL DE COLAS (FASE 2)
  // ==========================================

  async switchQueue(req, res, next) {
    try {
      const result = await extrusionService.switchQueuePriority({
        ...req.body,
        userId: req.user?.id || 1
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async scanRack(req, res, next) {
    try {
      const result = await extrusionService.scanRackPti({
        ...req.body,
        userId: req.user?.id || 1
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueues(req, res, next) {
    try {
      const queues = await extrusionService.getExtruderQueues();
      return res.status(200).json({
        success: true,
        data: queues
      });
    } catch (error) {
      next(error);
    }
  }

  async enqueueMix(req, res, next) {
    try {
      const result = await extrusionService.enqueueMix(req.body);
      return res.status(201).json({
        success: true,
        message: 'Mezcla agregada a la cola exitosamente.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getRacks(req, res, next) {
    try {
      const racks = await extrusionService.getPtiRacks();
      return res.status(200).json({
        success: true,
        data: racks
      });
    } catch (error) {
      next(error);
    }
  }

  async getExtrusionFormulas(req, res, next) {
    try {
      const formulas = await extrusionService.getExtrusionFormulas();
      return res.status(200).json({
        success: true,
        data: formulas
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExtrusionController();
