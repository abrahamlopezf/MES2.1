const qrcodesService = require('./qrcodes.service');
const qrIdentityRequestsService = require('./qrIdentityRequests.service');
const { successResponse } = require('../../shared/responses/apiResponse');

const { decryptQrData } = require('../../shared/utils/crypto.utils');
const { DEFAULT_LABEL_SIZE } = require('./printer/thermalLabelPdf');

const getLabelSize = (req) => String(req.body?.label_size || DEFAULT_LABEL_SIZE);
const getLabelLengthMm = (req) => Number(getLabelSize(req).split('x')[1]);
const sendThermalPdf = (res, result, filename) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-TraceFlow-Label-Count', String(result.summary.quantity));
  res.setHeader('X-TraceFlow-Label-Profile', result.profile.id);
  res.setHeader('X-TraceFlow-Label-Length-Mm', String(result.profile.heightMm));
  return res.send(result.buffer);
};
const generateQrBatch = async (req, res, next) => {
  try {
    const result = await qrcodesService.generateQrBatch(req.body, req.user);

    return successResponse(res, 'Lote de códigos QR generado correctamente.', result, 201);
  } catch (error) {
    return next(error);
  }
};

const createQrIdentityRequest = async (req, res, next) => {
  try {
    const result = await qrIdentityRequestsService.createQrIdentityRequest(req.body, req.user);
    return successResponse(res, 'Solicitud de códigos QR creada.', result, 201);
  } catch (error) {
    return next(error);
  }
};

const listQrIdentityRequests = async (req, res, next) => {
  try {
    const result = await qrIdentityRequestsService.listQrIdentityRequests(req.user);
    return successResponse(res, 'Solicitudes de códigos QR obtenidas.', { items: result });
  } catch (error) {
    return next(error);
  }
};

const listAvailableQrCodesForWarehouse = async (req, res, next) => {
  try {
    const result = await qrIdentityRequestsService.listAvailableQrCodesForWarehouse(req.user, req.query.limit, req.query.offset);
    return successResponse(res, 'Códigos QR vírgenes disponibles para surtido.', result);
  } catch (error) {
    return next(error);
  }
};

const fulfillQrIdentityRequest = async (req, res, next) => {
  try {
    const result = await qrIdentityRequestsService.fulfillQrIdentityRequest(req.params.id, req.body.qr_code_ids, req.user);
    return successResponse(res, 'Solicitud surtida con los QR seleccionados.', result);
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

const getQrBatchById = async (req, res, next) => {
  try {
    const result = await qrcodesService.getQrBatchById(req.params.id, req.user);
    return successResponse(res, 'Lote obtenido correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const printQrBatch = async (req, res, next) => {
  try {
    const { batch, qrCodeIds } = await qrcodesService.getQrBatchForThermalPrint(req.params.id, req.user);
    if (!qrCodeIds.length) {
      return res.status(400).json({ success: false, message: 'El lote no tiene códigos para imprimir.' });
    }
    const size = getLabelSize(req);
    const result = await qrcodesService.generateThermalPrintPdf(qrCodeIds, req.user, { labelLengthMm: getLabelLengthMm(req) });
    return sendThermalPdf(res, result, `batch-${String(batch.batch_code).replace(/[^A-Za-z0-9_-]/g, '-')}-DK2205-${size}.pdf`);
  } catch (error) {
    return next(error);
  }
};

const previewQrBatchPrint = async (req, res, next) => {
  try {
    const { qrCodeIds } = await qrcodesService.getQrBatchForThermalPrint(req.params.id, req.user);
    const result = await qrcodesService.prepareThermalPrintPreview(qrCodeIds, req.user, { labelLengthMm: getLabelLengthMm(req) });
    return successResponse(res, 'Previsualización térmica lista.', result);
  } catch (error) {
    return next(error);
  }
};

const printQrCode = async (req, res, next) => {
  try {
    const code = await qrcodesService.getQrCodeByValue(req.params.uuid, req.user);
    const size = getLabelSize(req);
    const result = await qrcodesService.generateThermalPrintPdf([code.id], req.user, { labelLengthMm: getLabelLengthMm(req) });
    return sendThermalPdf(res, result, `qr-${String(code.qr_code).replace(/[^A-Za-z0-9_-]/g, '-')}-DK2205-${size}.pdf`);
  } catch (error) {
    return next(error);
  }
};

const previewQrCodePrint = async (req, res, next) => {
  try {
    const code = await qrcodesService.getQrCodeByValue(req.params.uuid, req.user);
    const result = await qrcodesService.prepareThermalPrintPreview([code.id], req.user, { labelLengthMm: getLabelLengthMm(req) });
    return successResponse(res, 'Previsualización térmica lista.', result);
  } catch (error) {
    return next(error);
  }
};

const printMultipleQrs = async (req, res, next) => {
  try {
    const { uuids } = req.body;
    
    if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere un arreglo de uuids de códigos QR.' });
    }
    if (new Set(uuids).size !== uuids.length) {
      return res.status(400).json({ success: false, message: 'La selección contiene QR duplicados.' });
    }
    
    const codes = await qrcodesService.getQrCodesByUuids(uuids, req.user);
    
    if (!codes || codes.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontraron códigos QR válidos.' });
    }
    
    if (codes.length !== new Set(uuids).size) {
      return res.status(404).json({ success: false, message: 'No se encontraron todos los QR seleccionados.' });
    }
    const size = getLabelSize(req);
    const result = await qrcodesService.generateThermalPrintPdf(codes.map((code) => code.id), req.user, { labelLengthMm: getLabelLengthMm(req) });
    return sendThermalPdf(res, result, `qr-seleccion-DK2205-${size}.pdf`);
  } catch (error) {
    return next(error);
  }
};

const previewMultipleQrPrint = async (req, res, next) => {
  try {
    const { uuids } = req.body;
    if (!Array.isArray(uuids) || uuids.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere un arreglo de uuids de códigos QR.' });
    }
    if (new Set(uuids).size !== uuids.length) {
      return res.status(400).json({ success: false, message: 'La selección contiene QR duplicados.' });
    }
    const codes = await qrcodesService.getQrCodesByUuids(uuids, req.user);
    if (codes.length !== new Set(uuids).size) {
      return res.status(404).json({ success: false, message: 'No se encontraron todos los QR seleccionados.' });
    }
    const result = await qrcodesService.prepareThermalPrintPreview(codes.map((code) => code.id), req.user, { labelLengthMm: getLabelLengthMm(req) });
    return successResponse(res, 'Previsualización térmica lista.', result);
  } catch (error) {
    return next(error);
  }
};

const getQrCodeByValue = async (req, res, next) => {
  try {
    const decryptedQr = decryptQrData(req.params.qrCode);
    const result = await qrcodesService.getQrCodeByValue(decryptedQr, req.user);

    return successResponse(res, 'Código QR obtenido correctamente.', result);
  } catch (error) {
    return next(error);
  }
};

const lookup = async (req, res, next) => {
  try {
    const cleanCode = String(req.params.qrCode || '').trim();
    const decryptedQr = decryptQrData(cleanCode);
    const result = await qrcodesService.lookup(decryptedQr, req.user);
    return successResponse(res, 'Información del QR obtenida correctamente.', result);
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
    const payload = { ...req.body };
    if (payload.qr_code) {
      payload.qr_code = decryptQrData(payload.qr_code);
    }
    const result = await qrcodesService.validateQrForUse(payload, req.user);

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
  createQrIdentityRequest,
  listQrIdentityRequests,
  listAvailableQrCodesForWarehouse,
  fulfillQrIdentityRequest,
  getQrCodes,
  getQrCodeByValue,
  getQrEvents,
  assignQrCodes,
  validateQrForUse,
  cancelQrCode,
  getQrBatches,
  getQrBatchById,
  printQrBatch,
  previewQrBatchPrint,
  printQrCode,
  previewQrCodePrint,
  printMultipleQrs,
  previewMultipleQrPrint,
  lookup,
};
