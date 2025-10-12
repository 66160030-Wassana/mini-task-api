const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  
  console.error(err.stack);

  // Mongoose bad ObjectId (จะใช้ในอนาคต)
  // if (err.name === 'CastError') {
  //   const message = `Resource not found with id of ${err.value}`;
  //   error = new ErrorResponse(message, 404);
  // }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
        code: error.statusCode || 500,
        message: error.message || 'Internal Server Error'
    }
  });
};

module.exports = errorHandler;