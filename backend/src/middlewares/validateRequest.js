const { sendError } = require('../utils/apiResponse');

const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      // Zod parse lanza error si es inválido
      const parsedData = schema.parse(req[property]);
      req[property] = parsedData;
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
        return sendError(res, {
          code: 'VALIDATION_ERROR',
          message: `Estructura inválida: ${issues.join(', ')}`
        }, 400);
      }
      next(error);
    }
  };
};

module.exports = validateRequest;
