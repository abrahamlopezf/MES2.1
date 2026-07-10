const { successResponse } = require('../../shared/responses/apiResponse');
const healthService = require('./health.service');

const checkHealth = (req, res) => {
  const healthStatus = healthService.getHealthStatus();

  return successResponse(
    res,
    'API funcionando correctamente',
    healthStatus
  );
};

module.exports = {
  checkHealth,
};