const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const processRunService = require('./processRun.service');

const startRun = async (req, res) => {
  try {
    const payload = req.body;
    const currentUser = req.user;

    currentUser.ip_address = req.ip;
    currentUser.user_agent = req.get('User-Agent');

    const result = await processRunService.startRun(payload, currentUser);
    return successResponse(res, 'Corrida de producción iniciada con éxito', result, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al iniciar la corrida de producción', [], error.statusCode || 500);
  }
};

const registerOutput = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const currentUser = req.user;

    currentUser.ip_address = req.ip;
    currentUser.user_agent = req.get('User-Agent');

    const result = await processRunService.registerOutput(id, payload, currentUser);
    return successResponse(res, 'Entrada de producción registrada exitosamente en el Rack', result, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al registrar la salida de producción', [], error.statusCode || 500);
  }
};

module.exports = {
  startRun,
  registerOutput,
};
