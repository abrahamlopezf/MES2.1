const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const permissionsService = require('./permissions.service');

const getPermissions = async (req, res) => {
  try {
    const permissions = await permissionsService.getPermissions();

    return successResponse(
      res,
      'Permisos consultados correctamente.',
      permissions,
      200
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || 'No pudimos consultar los permisos.',
      [],
      error.statusCode || 500
    );
  }
};

module.exports = {
  getPermissions,
};