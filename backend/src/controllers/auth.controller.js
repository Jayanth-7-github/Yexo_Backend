const AuthService = require("../services/auth.service");
const ApiResponse = require("../utils/response");
const { asyncHandler } = require("../middleware/error.middleware");

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { username, password, email, phoneNumber } = req.body;

  const result = await AuthService.register({
    username,
    password,
    email,
    phoneNumber,
  });

  // Set tokens in HTTP-only cookies
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
  });

  ApiResponse.created(res, result, "User registered successfully");
});

/**
 * Login user
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip;

  const result = await AuthService.login({ username, password }, ipAddress);

  // Set tokens in HTTP-only cookies
  res.cookie("accessToken", result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
  });

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
  });

  ApiResponse.success(res, result, "Login successful");
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  // User is already attached by auth middleware
  ApiResponse.success(res, req.user);
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  const ipAddress = req.ip;

  if (!refreshToken) {
    return ApiResponse.badRequest(res, "Refresh token is required");
  }

  const tokens = await AuthService.refreshAccessToken(refreshToken, ipAddress);

  // Set new tokens in HTTP-only cookies
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
  });

  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 365 * 24 * 60 * 60 * 1000, // 365 days
  });

  ApiResponse.success(res, tokens, "Token refreshed successfully");
});

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  const ipAddress = req.ip;

  if (!refreshToken) {
    return ApiResponse.badRequest(res, "Refresh token is required");
  }

  await AuthService.logout(refreshToken, ipAddress);

  // Clear cookies with same options as when they were set
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  ApiResponse.success(res, null, "Logout successful");
});

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  logout,
};
