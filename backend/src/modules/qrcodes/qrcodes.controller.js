const qrcodesService = require('./qrcodes.service');
const { successResponse } = require('../../shared/responses/apiResponse');

const generateQrBatch = async (req, res, next) => {
  try {
    const result = await qrcodesService.generateQrBatch(req.body, req.user);

    return successResponse(res, 'Lote de códigos QR generado correctamente.', result, 201);
  } catch (error) {
    return next(error);
  }
};

const getQrCodes = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrCodes(req.query, req.user);

    return successResponse(res, 'Códigos QR obtenidos correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const getQrBatches = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrBatches(req.query, req.user);
    return successResponse(res, 'Lotes de códigos QR obtenidos correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const getQrCodeByValue = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrCodeByValue(req.params.qrCode, req.user);

    return successResponse(res, 'Código QR obtenido correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const getQrEvents = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrEvents(req.params.id, req.user);

    return successResponse(res, 'Eventos del código QR obtenidos correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const assignQrCodes = async (req, res, next) => {
  try {
    const result = await qrcodesService.assignQrCodes(req.body, req.user);

    return successResponse(res, 'Códigos QR asignados correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const validateQrForUse = async (req, res, next) => {
  try {
    const result = await qrcodesService.validateQrForUse(req.body, req.user);

    return successResponse(res, 'Código QR validado correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const cancelQrCode = async (req, res, next) => {
  try {
    const result = await qrcodesService.cancelQrCode(req.params.id, req.body, req.user);

    return successResponse(res, 'Código QR cancelado correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  generateQrBatch,
  getQrCodes,
  getQrCodeByValue,
  getQrEvents,
  assignQrCodes,
  validateQrForUse,
  cancelQrCode,
  getQrBatches,
};