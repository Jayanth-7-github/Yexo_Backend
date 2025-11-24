const GroupService = require("../services/group.service");
const ApiResponse = require("../utils/response");
const { asyncHandler } = require("../middleware/error.middleware");

/**
 * Create a new group
 * POST /api/groups
 */
const createGroup = asyncHandler(async (req, res) => {
  const { name, description, avatarUrl, memberIds } = req.body;

  if (!name || name.trim().length === 0) {
    return ApiResponse.badRequest(res, "Group name is required");
  }

  const result = await GroupService.createGroup(req.userId, {
    name,
    description,
    avatarUrl,
    memberIds,
  });

  ApiResponse.created(res, result, "Group created successfully");
});

/**
 * Get all groups for current user
 * GET /api/groups
 */
const getUserGroups = asyncHandler(async (req, res) => {
  const groups = await GroupService.getUserGroups(req.userId);

  ApiResponse.success(res, groups);
});

/**
 * Get group by ID
 * GET /api/groups/:groupId
 */
const getGroupById = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const group = await GroupService.getGroupById(groupId, req.userId);

  ApiResponse.success(res, group);
});

/**
 * Update group information
 * PATCH /api/groups/:groupId
 */
const updateGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const updates = req.body;

  const group = await GroupService.updateGroup(groupId, req.userId, updates);

  ApiResponse.success(res, group, "Group updated successfully");
});

/**
 * Add members to group
 * POST /api/groups/:groupId/members
 */
const addMembers = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { memberIds } = req.body;

  if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return ApiResponse.badRequest(res, "memberIds array is required");
  }

  const group = await GroupService.addMembers(groupId, req.userId, memberIds);

  ApiResponse.success(res, group, "Members added successfully");
});

/**
 * Remove member from group
 * DELETE /api/groups/:groupId/members/:memberId
 */
const removeMember = asyncHandler(async (req, res) => {
  const { groupId, memberId } = req.params;

  const group = await GroupService.removeMember(groupId, req.userId, memberId);

  ApiResponse.success(res, group, "Member removed successfully");
});

/**
 * Leave group
 * POST /api/groups/:groupId/leave
 */
const leaveGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const result = await GroupService.leaveGroup(groupId, req.userId);

  ApiResponse.success(res, result);
});

/**
 * Make user admin
 * POST /api/groups/:groupId/admins
 */
const makeAdmin = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return ApiResponse.badRequest(res, "userId is required");
  }

  const group = await GroupService.makeAdmin(groupId, req.userId, userId);

  ApiResponse.success(res, group, "User promoted to admin");
});

/**
 * Remove admin
 * DELETE /api/groups/:groupId/admins/:userId
 */
const removeAdmin = asyncHandler(async (req, res) => {
  const { groupId, userId } = req.params;

  const group = await GroupService.removeAdmin(groupId, req.userId, userId);

  ApiResponse.success(res, group, "Admin removed successfully");
});

/**
 * Delete group
 * DELETE /api/groups/:groupId
 */
const deleteGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  const result = await GroupService.deleteGroup(groupId, req.userId);

  ApiResponse.success(res, result);
});

module.exports = {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup,
  makeAdmin,
  removeAdmin,
  deleteGroup,
};
