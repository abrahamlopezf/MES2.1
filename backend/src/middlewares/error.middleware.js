const { errorResponse } = require('../shared/responses/apiResponse');

const fs = require('fs');
const errorMiddleware = (err, req, res, next) => {
  console.error('ERROR:', err);
  try {
    const msg = err.original ? err.original.message : err.message;
    fs.appendFileSync('error_log.txt', new Date().toISOString() + '\\nMessage: ' + msg + '\\nStack: ' + err.stack + '\\n\\n');
  } catch (e) {}

  const statusCode = err.statusCode || (err.name === 'SequelizeValidationError' ? 400 : 500);
  const isClientError = statusCode >= 400 && statusCode < 500;
  const message = isClientError ? (err.message || 'Solicitud inválida') : 'Ocurrió un error interno en el servidor';
  const errors = err.errors || (process.env.NODE_ENV === 'development' ? [err.message] : []);

  return errorResponse(
    res,
    message,
    errors,
    statusCode
  );
};

module.exports = errorMiddleware;