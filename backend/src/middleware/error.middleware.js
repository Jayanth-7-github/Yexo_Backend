const logger = require("../utils/logger");
const ApiResponse = require("../utils/response");
const config = require("../config/config");

/**
 * Global error handler middleware
 * Must be placed after all routes
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error("Error:", {
    message: err.message,
    stack: config.nodeEnv === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.userId,
  });

  // Handle specific error types
  if (err.name === "ValidationError") {
    // Mongoose validation error
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiResponse.validationError(res, errors);
  }

  if (err.name === "CastError" && err.kind === "ObjectId") {
    return ApiResponse.badRequest(res, "Invalid ID format");
  }

  if (err.code === 11000) {
    // Duplicate key error
    const field = Object.keys(err.keyPattern)[0];
    return ApiResponse.conflict(res, `${field} already exists`);
  }

  if (err.name === "JsonWebTokenError") {
    return ApiResponse.unauthorized(res, "Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    return ApiResponse.unauthorized(res, "Token expired");
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return ApiResponse.badRequest(res, "File size too large");
    }
    return ApiResponse.badRequest(res, `File upload error: ${err.message}`);
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  // Don't expose error details in production
  const response = {
    success: false,
    message:
      config.nodeEnv === "production" && statusCode === 500
        ? "Internal server error"
        : message,
    code: statusCode,
  };

  // Include stack trace in development
  if (config.nodeEnv === "development" && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
};
