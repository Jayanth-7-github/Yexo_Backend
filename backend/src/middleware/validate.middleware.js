const { validationResult } = require("express-validator");
const ApiResponse = require("../utils/response");

/**
 * Middleware to validate request using express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return ApiResponse.validationError(res, formattedErrors);
  }

  next();
};

module.exports = validate;
