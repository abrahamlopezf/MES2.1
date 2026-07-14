const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const materialInventoryService = require('./materialInventory.service');

const receiveMaterial = async (req, res) => {
  try {
    const payload = req.body;
    const currentUser = req.user;

    // Attach basic request info for auditing if needed
    currentUser.ip_address = req.ip;
    currentUser.user_agent = req.get('User-Agent');

    const result = await materialInventoryService.receiveMaterial(payload, currentUser);
    return successResponse(res, 'Recepción de material registrada con éxito', result, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Error al registrar la recepción de material', [], error.statusCode || 500);
  }
};

module.exports = {
  receiveMaterial,
};
