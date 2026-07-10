const { errorResponse } = require('../shared/responses/apiResponse');

const notFoundMiddleware = (req, res) => {
  return errorResponse(
    res,
    `La ruta ${req.originalUrl} no existe`,
    [],
    404
  );
};

module.exports = notFoundMiddleware;