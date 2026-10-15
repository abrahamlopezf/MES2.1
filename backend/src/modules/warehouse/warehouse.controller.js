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

const getAreaInventory = async (req, res, next) => {
  try {
    const result = await warehouseService.getAreaInventory(req.query, req.user);
    return successResponse(res, 'Inventario de área obtenido correctamente.', result);
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

const getNextConsumptionOrderNumber = async (req, res, next) => {
  try {
    const { MaterialConsumption } = require('../../database/models');
    const { Op } = require('sequelize');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `VAL-MNL-${year}${month}-`;

    const count = await MaterialConsumption.count({
      where: {
        order_number: { [Op.like]: `${prefix}%` }
      }
    });

    const orderNumber = `${prefix}${String(count + 1).padStart(3, '0')}`;
    return res.status(200).json({ success: true, order_number: orderNumber });
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

const getDashboardMetrics = async (req, res, next) => {
  try {
    const result = await warehouseService.getDashboardMetrics(req.user);
    return successResponse(res, 'Métricas del dashboard de almacén obtenidas', result);
  } catch (error) {
    return next(error);
  }
};

const manualEntry = async (req, res, next) => {
  try {
    const result = await warehouseService.manualEntry(req.body, req.user);
    return successResponse(res, 'Ingreso manual registrado correctamente', result, 201);
  } catch (error) {
    console.error("DEBUG MANUAL ENTRY ERROR:", error);
    const errorMessage = error.original?.message || error.parent?.message || error.message || 'Error desconocido';
    return res.status(400).json({
      success: false,
      message: errorMessage,
      error_name: error.name
    });
  }
};

const getMermaScrapReport = async (req, res, next) => {
  try {
    const result = await warehouseService.getMermaScrapReport();
    return successResponse(res, 'Reporte de Merma y Scrap obtenido', result);
  } catch (error) {
    return next(error);
  }
};

const getMermaScrapDetails = async (req, res, next) => {
  try {
    const result = await warehouseService.getMermaScrapDetails(req.params.material_id);
    return successResponse(res, 'Detalles de Merma y Scrap obtenidos', result);
  } catch (error) {
    return next(error);
  }
};
const requestDisposeLotes = async (req, res, next) => {
  try {
    const result = await warehouseService.requestDisposeLotes(req.body, req.user);
    return successResponse(res, 'Solicitud de baja registrada exitosamente.', result);
  } catch (error) {
    return next(error);
  }
};

const getWasteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await warehouseService.getWasteRequest(id, req.user);
    return successResponse(res, 'Solicitud de baja obtenida.', request);
  } catch (error) {
    return next(error);
  }
};

const resolveWasteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await warehouseService.resolveWasteRequest(id, status, req.user);
    return successResponse(res, `Solicitud de baja ${status === 'APPROVED' ? 'aprobada' : 'rechazada'} exitosamente.`, result);
  } catch (error) {
    return next(error);
  }
};

const getLowStockReport = async (req, res, next) => {
  try {
    const result = await warehouseService.getLowStockReport();
    return successResponse(res, 'Reporte de stocks bajos obtenido.', result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getInventory,
  getAreaInventory,
  getMaterialLotes,
  disposeLotes,
  getLoteDetails,
  consumeMaterials,
  getNextConsumptionOrderNumber,
  changeLocation,
  getDashboardMetrics,
  manualEntry,
  getMermaScrapReport,
  getMermaScrapDetails,
  requestDisposeLotes,
  getWasteRequest,
  resolveWasteRequest,
  getLowStockReport
};
