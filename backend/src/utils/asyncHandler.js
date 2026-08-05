/**
 * Envuelve los controladores asíncronos para pasar los errores al errorHandler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
