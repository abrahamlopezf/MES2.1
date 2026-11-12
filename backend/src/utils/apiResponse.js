const sendSuccess = (res, data, meta = {}, statusCode = 200) => {
  const response = {
    success: true,
    data
  };
  
  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }
  
  return res.status(statusCode).json(response);
};

const sendError = (res, error, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'Error interno del servidor.',
      ...(error.details ? { details: error.details } : {})
    }
  });
};

module.exports = {
  sendSuccess,
  sendError
};
