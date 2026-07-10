const { errorResponse } = require('../shared/responses/apiResponse');

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return errorResponse(
        res,
        'Revisa la información capturada.',
        errors,
        400
      );
    }

    req.body = value;
    return next();
  };
};

module.exports = validate;