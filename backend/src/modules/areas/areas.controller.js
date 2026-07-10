const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const areasService = require('./areas.service');

const getAreas = async (req, res) => {
  try {
    const areas = await areasService.getAreas();

    return successResponse(
      res,
      'Áreas consultadas correctamente.',
      areas,
      200
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || 'No pudimos consultar las áreas.',
      [],
      error.statusCode || 500
    );
  }
};

const getAreaById = async (req, res) => {
  try {
    const area = await areasService.getAreaById(req.params.id);

    return successResponse(
      res,
      'Área consultada correctamente.',
      area,
      200
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || 'No pudimos consultar el área.',
      [],
      error.statusCode || 500
    );
  }
};

module.exports = {
  getAreas,
  getAreaById,
};