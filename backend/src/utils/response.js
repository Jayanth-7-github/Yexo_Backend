/**
 * Standardized API response utilities
 */

class ApiResponse {
  static success(res, data = null, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(
    res,
    message = "An error occurred",
    statusCode = 500,
    details = null
  ) {
    const response = {
      success: false,
      message,
      code: statusCode,
    };

    if (details) {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  }

  static created(res, data = null, message = "Resource created successfully") {
    return this.success(res, data, message, 201);
  }

  static badRequest(res, message = "Bad request", details = null) {
    return this.error(res, message, 400, details);
  }

  static unauthorized(res, message = "Unauthorized") {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = "Forbidden") {
    return this.error(res, message, 403);
  }

  static notFound(res, message = "Resource not found") {
    return this.error(res, message, 404);
  }

  static conflict(res, message = "Conflict", details = null) {
    return this.error(res, message, 409, details);
  }

  static validationError(res, errors) {
    return this.error(res, "Validation failed", 422, errors);
  }
}

module.exports = ApiResponse;
