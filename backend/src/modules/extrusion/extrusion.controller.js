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

  async getWipChildQr(req, res, next) {
    try {
      const result = await extrusionService.getWipChildQr(req.params.qrCode);
      return res.status(200).json({
        success: true,
        data: result
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

  async getPreparedMixHistory(req, res, next) {
    try {
      const history = await extrusionService.getPreparedMixHistory(req.query);
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  async getMixContainersByQrOrFolio(req, res, next) {
    try {
      const { identifier } = req.params;
      const result = await extrusionService.getMixContainersByQrOrFolio(identifier);
      return res.status(200).json({
        success: true,
        data: result
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

  async createRack(req, res, next) {
    try {
      const rack = await extrusionService.createPtiRack(req.body);
      return res.status(201).json({
        success: true,
        message: `Rack ${rack.rack_code} creado exitosamente.`,
        data: rack
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

  async registerScrap(req, res, next) {
    try {
      const result = await extrusionService.registerOperationalScrap({
        ...req.body,
        userId: req.user?.id || 1
      });
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMassBalance(req, res, next) {
    try {
      const { mixQr } = req.params;
      const balance = await extrusionService.getMassBalance(mixQr);
      return res.status(200).json({
        success: true,
        data: balance
      });
    } catch (error) {
      next(error);
    }
  }

  async getScrapLogs(req, res, next) {
    try {
      const logs = await extrusionService.getScrapLogs(req.query);
      return res.status(200).json({
        success: true,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePtiRackPrice(req, res, next) {
    try {
      const { id } = req.params;
      const rack = await extrusionService.updatePtiRackPrice(id, req.body);
      return res.status(200).json({
        success: true,
        message: `Rack ${rack.rack_code} actualizado correctamente.`,
        data: rack
      });
    } catch (error) {
      next(error);
    }
  }

  async splitMixtureContainers(req, res, next) {
    try {
      const result = await extrusionService.splitMixtureContainers({
        ...req.body,
        userId: req.user?.id || 1
      });
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async recordMixtureTransition(req, res, next) {
    try {
      const result = await extrusionService.recordMixtureTransition({
        ...req.body,
        userId: req.user?.id || 1
      });
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getExtrusionValuation(req, res, next) {
    try {
      const result = await extrusionService.getExtrusionValuation(req.query);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // FÓRMULAS & ÍNDICE DE MULTIPLICACIÓN
  // ==========================================

  async updateFormula(req, res, next) {
    try {
      const formula = await extrusionService.updateFormula(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Fórmula actualizada exitosamente.',
        data: formula
      });
    } catch (error) {
      next(error);
    }
  }

  async getFormulaById(req, res, next) {
    try {
      const formula = await extrusionService.getFormulaDetailsById(req.params.id);
      return res.status(200).json({
        success: true,
        data: formula
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // CATÁLOGO DE PRODUCTOS TERMINADOS INTERMEDIOS (PTI)
  // ==========================================

  async getPtiProducts(req, res, next) {
    try {
      const ptiProducts = await extrusionService.getPtiProducts(req.query);
      return res.status(200).json({
        success: true,
        data: ptiProducts
      });
    } catch (error) {
      next(error);
    }
  }

  async getPtiProductById(req, res, next) {
    try {
      const ptiProduct = await extrusionService.getPtiProductById(req.params.id);
      return res.status(200).json({
        success: true,
        data: ptiProduct
      });
    } catch (error) {
      next(error);
    }
  }

  async createPtiProduct(req, res, next) {
    try {
      const ptiProduct = await extrusionService.createPtiProduct(req.body);
      return res.status(201).json({
        success: true,
        message: 'Producto PTI registrado exitosamente en el catálogo.',
        data: ptiProduct
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePtiProduct(req, res, next) {
    try {
      const ptiProduct = await extrusionService.updatePtiProduct(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Producto PTI actualizado exitosamente.',
        data: ptiProduct
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePtiProduct(req, res, next) {
    try {
      const result = await extrusionService.deletePtiProduct(req.params.id);
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // CATÁLOGO DE MÁQUINAS, SILOS & TOGGLE HÍBRIDO
  // ==========================================

  async getMachines(req, res, next) {
    try {
      const machines = await extrusionService.getMachines();
      return res.status(200).json({
        success: true,
        data: machines
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleModoSilo(req, res, next) {
    try {
      const machine = await extrusionService.toggleModoSilo(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: `Modo operativo de ${machine.name} actualizado a: ${machine.modo_silo ? 'Alimentación por Silo' : 'Alimentación Manual'}.`,
        data: machine
      });
    } catch (error) {
      next(error);
    }
  }

  async assignExtruderSilo(req, res, next) {
    try {
      const machine = await extrusionService.assignExtruderSilo(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: `Silo asignado correctamente a ${machine.name}.`,
        data: machine
      });
    } catch (error) {
      next(error);
    }
  }

  async getSilos(req, res, next) {
    try {
      const silos = await extrusionService.getSilos();
      return res.status(200).json({
        success: true,
        data: silos
      });
    } catch (error) {
      next(error);
    }
  }

  async receiveSiloInvoiceEntry(req, res, next) {
    try {
      const result = await extrusionService.receiveSiloInvoiceEntry(req.body, req.user?.id || 1);
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result.silo
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExtrusionController();
