const UserService = require("../services/user.service");
const ApiResponse = require("../utils/response");
const { asyncHandler } = require("../middleware/error.middleware");

/**
 * Search users
 * GET /api/users?q=searchQuery
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { q, limit = 20 } = req.query;

  if (!q || q.trim().length === 0) {
    return ApiResponse.badRequest(res, "Search query is required");
  }

  const users = await UserService.searchUsers(q, req.userId, parseInt(limit));

  ApiResponse.success(res, users);
});

/**
 * Get user profile by ID
 * GET /api/users/:id
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await UserService.getUserProfile(id);

  ApiResponse.success(res, user);
});

/**
 * Update current user profile
 * PATCH /api/users/me
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const updates = req.body;

  const user = await UserService.updateProfile(req.userId, updates);

  ApiResponse.success(res, user, "Profile updated successfully");
});

/**
 * Get current user's profile
 * GET /api/users/me
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const user = await UserService.getUserProfile(req.userId);

  ApiResponse.success(res, user);
});

module.exports = {
  searchUsers,
  getUserProfile,
  updateMyProfile,
  getMyProfile,
};
