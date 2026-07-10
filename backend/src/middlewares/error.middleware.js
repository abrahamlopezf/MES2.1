const { errorResponse } = require('../shared/responses/apiResponse');

const errorMiddleware = (err, req, res, next) => {
  console.error('ERROR:', err);

  return errorResponse(
    res,
    'Ocurrió un error interno en el servidor',
    process.env.NODE_ENV === 'development' ? [err.message] : [],
    err.statusCode || 500
  );
};

module.exports = errorMiddleware;