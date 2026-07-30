const warehouseService = require('./warehouse.service');
const { successResponse } = require('../../shared/responses/apiResponse');

const receiveMaterial = async (req, res, next) => {
  try {
    const result = await warehouseService.receiveMaterial(req.body, req.user);
    return successResponse(res, 'Material recibido exitosamente.', result, 201);
  } catch (error) {
    return next(error);
  }
};

const getInventory = async (req, res, next) => {
  try {
    const result = await warehouseService.getInventory(req.query, req.user);
    return successResponse(res, 'Inventario obtenido correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  receiveMaterial,
  getInventory,
};
