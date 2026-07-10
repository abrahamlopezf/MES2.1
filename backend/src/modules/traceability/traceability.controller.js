const traceabilityService = require('./traceability.service');

const scanQrCode = async (req, res, next) => {
  try {
    const result = await traceabilityService.scanQrCode({
      scannedCode: req.params.qrCode,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      message: result,
      data: 'QR consultado correctamente.',
    });
  } catch (error) {
    return next(error);
  }
};

const assignQrCodesToArea = async (req, res, next) => {
  try {
    const result = await traceabilityService.assignQrCodesToArea({
      payload: req.body,
      user: req.user,
    });

    return res.status(201).json({
      success: true,
      message: result,
      data: 'QR asignados correctamente al área.',
    });
  } catch (error) {
    return next(error);
  }
};

const registerRawMaterialEntry = async (req, res, next) => {
  try {
    const result = await traceabilityService.registerRawMaterialEntry({
      payload: req.body,
      user: req.user,
    });

    return res.status(201).json({
      success: true,
      message: result,
      data: 'Entrada de materia prima registrada correctamente.',
    });
  } catch (error) {
    return next(error);
  }
};

const warehouseTransfer = async (req, res, next) => {
  try {
    const result = await traceabilityService.warehouseTransfer({
      payload: req.body,
      user: req.user,
    });

    return res.status(201).json({
      success: true,
      message: result,
      data: 'Material transferido correctamente desde Almacén.',
    });
  } catch (error) {
    return next(error);
  }
};

const prepareProcessFormula = async (req, res, next) => {
  try {
    const result = await traceabilityService.prepareProcessFormula({
      payload: req.body,
      user: req.user,
      req,
    });

    return res.status(201).json({
      success: true,
      message: result,
      data: 'Preparación de fórmula creada correctamente.',
    });
  } catch (error) {
    return next(error);
  }
};

const receiveInArea = async (req, res, next) => {
  try {
    const result = await traceabilityService.receiveInArea({
      payload: req.body,
      user: req.user,
      req,
    });

    return res.status(200).json({
      success: true,
      message: result,
      data: 'Material recibido correctamente en el área destino.',
    });
  } catch (error) {
    return next(error);
  }
};

const startProcessRun = async (req, res, next) => {
  try {
    const result = await traceabilityService.startProcessRun({
      payload: req.body,
      user: req.user,
      req,
    });

    return res.status(201).json({
      success: true,
      message: result,
      data: 'Corrida de proceso iniciada correctamente.',
    });
  } catch (error) {
    return next(error);
  }
};

const registerProcessOutputToRack = async (req, res, next) => {
  try {
    const result = await traceabilityService.registerProcessOutputToRack({
      payload: req.body,
      user: req.user,
      req,
    });

    return res.status(201).json({
      success: true,
      message: result,
      data: 'Salida parcial registrada correctamente en rack.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  scanQrCode,
  assignQrCodesToArea,
  registerRawMaterialEntry,
  warehouseTransfer,
  prepareProcessFormula,
  receiveInArea,
  startProcessRun,
  registerProcessOutputToRack,
};