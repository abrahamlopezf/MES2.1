const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const processPreparationService = require('./processPreparation.service');

const createPreparation = async (req, res) => {
  try {
    const payload = req.body;
    const currentUser = req.user;

    currentUser.ip_address = req.ip;
    currentUser.user_agent = req.get('User-Agent');

    const result = await processPreparationService.createPreparation(payload, currentUser);
    return successResponse(res, 'Preparación de mezcla registrada con éxito', result, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al registrar la preparación de mezcla', [], error.statusCode || 500);
  }
};

module.exports = {
  createPreparation,
};
