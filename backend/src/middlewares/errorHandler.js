const { sendError } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err);
  try {
    require('fs').writeFileSync('debug_error.txt', String(err.stack || err.message));
  } catch (e) {}

  // Sequelize Errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return sendError(res, {
      code: 'DUPLICATE_RECORD',
      message: err.errors[0]?.message || 'El registro ya existe.'
    }, 409);
  }

  if (err.name === 'SequelizeValidationError') {
    return sendError(res, {
      code: 'VALIDATION_ERROR',
      message: err.errors[0]?.message || 'Error de validación en la base de datos.'
    }, 422);
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return sendError(res, {
      code: 'FOREIGN_KEY_ERROR',
      message: 'Referencia inválida o registro en uso por otra entidad.'
    }, 409);
  }

  if (err.name === 'SequelizeOptimisticLockError') {
    return sendError(res, {
      code: 'OPTIMISTIC_LOCK_ERROR',
      message: 'El registro fue modificado por otro usuario. Recarga los datos y vuelve a intentarlo.'
    }, 409);
  }

  // Domain / Custom Errors
  if (err.name === 'DomainError' || err.name === 'BusinessRuleError') {
    return sendError(res, {
      code: err.code || err.name,
      message: err.message
    }, err.statusCode || 400);
  }

  if (err.name === 'NotFoundError') {
    return sendError(res, {
      code: 'NOT_FOUND',
      message: err.message || 'Recurso no encontrado.'
    }, 404);
  }

  // Fallback genérico
  return sendError(res, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Error interno del servidor.'
  }, 500);
};

module.exports = errorHandler;
