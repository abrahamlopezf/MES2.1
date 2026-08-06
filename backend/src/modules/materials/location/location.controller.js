const locationService = require('./location.service');

class LocationController {
  async list(req, res, next) {
    try {
      const result = await locationService.list(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const record = await locationService.findByUuid(req.params.uuid);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.user) data.created_by = req.user.id;
      
      const record = await locationService.create(data);
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.user) data.updated_by = req.user.id;
      
      const record = await locationService.update(req.params.uuid, data);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await locationService.delete(req.params.uuid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const result = await locationService.restore(req.params.uuid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LocationController();
