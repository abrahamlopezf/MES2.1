const storageLocationStatusService = require('./storageLocationStatus.service');

class StorageLocationStatusController {
  async list(req, res, next) {
    try {
      const result = await storageLocationStatusService.list(req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const record = await storageLocationStatusService.findByUuid(req.params.uuid);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.user) data.created_by = req.user.id;
      
      const record = await storageLocationStatusService.create(data);
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const data = { ...req.body };
      if (req.user) data.updated_by = req.user.id;
      
      const record = await storageLocationStatusService.update(req.params.uuid, data);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await storageLocationStatusService.delete(req.params.uuid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const result = await storageLocationStatusService.restore(req.params.uuid);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StorageLocationStatusController();
