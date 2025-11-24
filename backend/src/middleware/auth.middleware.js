const AuthService = require("../services/auth.service");
const ApiResponse = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Middleware to authenticate JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header OR cookies
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken; // Get from cookie
    }

    if (!token) {
      logger.warn(
        `No token provided. Auth header: ${authHeader}, Cookie: ${
          req.cookies?.accessToken ? "present" : "absent"
        }`
      );
      return ApiResponse.unauthorized(res, "No token provided");
    }

    logger.info(`Verifying token: ${token.substring(0, 20)}...`);

    // Verify token
    const payload = AuthService.verifyAccessToken(token);

    // Get user info
    const user = await AuthService.getUserById(payload.userId);

    // Attach user to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`Authentication error: ${errorMsg}`);
    return ApiResponse.unauthorized(res, "Invalid or expired token");
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = AuthService.verifyAccessToken(token);
      const user = await AuthService.getUserById(payload.userId);
      req.user = user;
      req.userId = user._id;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth,
};
