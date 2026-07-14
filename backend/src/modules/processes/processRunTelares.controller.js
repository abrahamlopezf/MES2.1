const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const processRunTelaresService = require('./processRunTelares.service');

const startTelares = async (req, res) => {
  try {
    const payload = req.body;
    const currentUser = req.user;

    currentUser.ip_address = req.ip;
    currentUser.user_agent = req.get('User-Agent');

    const result = await processRunTelaresService.startTelares(payload, currentUser);
    return successResponse(res, 'Corrida de Telar iniciada con éxito', result, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al iniciar el telar', [], error.statusCode || 500);
  }
};

const registerInput = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const currentUser = req.user;

    currentUser.ip_address = req.ip;
    currentUser.user_agent = req.get('User-Agent');

    const result = await processRunTelaresService.registerInput(id, payload, currentUser);
    return successResponse(res, 'Consumo de carretes registrado exitosamente', result, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al registrar consumo de carretes', [], error.statusCode || 500);
  }
};

const finishTelares = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const currentUser = req.user;

    currentUser.ip_address = req.ip;
    currentUser.user_agent = req.get('User-Agent');

    const result = await processRunTelaresService.finishTelares(id, payload, currentUser);
    return successResponse(res, 'Rollo de Tela generado y registrado exitosamente', result, 200);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al finalizar el telar', [], error.statusCode || 500);
  }
};

module.exports = {
  startTelares,
  registerInput,
  finishTelares,
};
