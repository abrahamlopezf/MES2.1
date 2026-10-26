const globoService = require('./globo.service');

class GloboController {
  async getSpecifications(req, res, next) {
    try {
      const data = await globoService.getSpecifications(req.user);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getSpecificationById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await globoService.getSpecificationById(id, req.user);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createSpecification(req, res, next) {
    try {
      const data = await globoService.createSpecification(req.body, req.user);
      return res.status(201).json({ success: true, message: 'Especificación creada exitosamente.', data });
    } catch (err) {
      next(err);
    }
  }

  async updateSpecification(req, res, next) {
    try {
      const { id } = req.params;
      const data = await globoService.updateSpecification(id, req.body, req.user);
      return res.status(200).json({ success: true, message: 'Especificación actualizada exitosamente.', data });
    } catch (err) {
      next(err);
    }
  }

  async toggleSpecification(req, res, next) {
    try {
      const { id } = req.params;
      const result = await globoService.toggleSpecification(id);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getWipSummary(req, res, next) {
    try {
      const data = await globoService.getWipSummary(req.user);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async assessRollMaterials(req, res, next) {
    try {
      const { roll_id, specification_id } = req.body;
      const data = await globoService.assessRollMaterials({ roll_id, specification_id });
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createOdcForRoll(req, res, next) {
    try {
      const { roll_id, specification_id, missing_materials, notes } = req.body;
      const data = await globoService.createOdcForRoll({
        roll_id,
        specification_id,
        missing_materials,
        user_id: req.user.id,
        notes,
      });
      return res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }

  async verifyScan(req, res, next) {
    try {
      const { qr_code } = req.body;
      const data = await globoService.verifyScan({
        qr_code,
        operator_id: req.user.id,
        currentUser: req.user,
      });
      return res.status(200).json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  async transformRoll(req, res, next) {
    try {
      const { roll_id, specification_id, meters_out, weight_out_kg, notes } = req.body;
      const data = await globoService.transformRoll({
        roll_id,
        specification_id,
        meters_out,
        weight_out_kg,
        operator_id: req.user.id,
        currentUser: req.user,
        notes,
      });
      return res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new GloboController();
