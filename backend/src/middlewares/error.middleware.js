const { errorResponse } = require('../shared/responses/apiResponse');

const fs = require('fs');
const errorMiddleware = (err, req, res, next) => {
  console.error('ERROR:', err);
  try {
    const msg = err.original ? err.original.message : err.message;
    fs.appendFileSync('error_log.txt', new Date().toISOString() + '\\nMessage: ' + msg + '\\nStack: ' + err.stack + '\\n\\n');
  } catch (e) {}

  return errorResponse(
    res,
    'Ocurrió un error interno en el servidor',
    process.env.NODE_ENV === 'development' ? [err.message] : [],
    err.statusCode || 500
  );
};

module.exports = errorMiddleware;