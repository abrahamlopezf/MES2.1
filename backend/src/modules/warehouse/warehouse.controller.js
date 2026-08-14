const warehouseService = require('./warehouse.service');
const { successResponse } = require('../../shared/responses/apiResponse');

const getInventory = async (req, res, next) => {
  try {
    const result = await warehouseService.getInventory(req.query, req.user);
    return successResponse(res, 'Inventario obtenido correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const getMaterialLotes = async (req, res, next) => {
  try {
    const result = await warehouseService.getMaterialLotes(req.params.material_id);
    return successResponse(res, 'Lotes obtenidos correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const disposeLotes = async (req, res, next) => {
  try {
    const result = await warehouseService.disposeLotes(req.body, req.user);
    return successResponse(res, 'Baja registrada exitosamente.', result);
  } catch (error) {
    return next(error);
  }
};

const getLoteDetails = async (req, res, next) => {
  try {
    const result = await warehouseService.getLoteDetails(req.params.id);
    return successResponse(res, 'Detalles del lote obtenidos.', result);
  } catch (error) {
    return next(error);
  }
};

const consumeMaterials = async (req, res, next) => {
  try {
    const result = await warehouseService.consumeMaterials(req.body, req.user);
    return successResponse(res, 'Consumo registrado exitosamente.', result);
  } catch (error) {
    return next(error);
  }
};

const changeLocation = async (req, res, next) => {
  try {
    const result = await warehouseService.changeLocation(req.body, req.user);
    return successResponse(res, 'Localidad actualizada exitosamente.', result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getInventory,
  getMaterialLotes,
  disposeLotes,
  getLoteDetails,
  consumeMaterials,
  changeLocation
};
