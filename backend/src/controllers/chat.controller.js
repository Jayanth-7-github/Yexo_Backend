const ChatService = require("../services/chat.service");
const ApiResponse = require("../utils/response");
const { asyncHandler } = require("../middleware/error.middleware");

/**
 * Get all chats for current user
 * GET /api/chats
 */
const getUserChats = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const chats = await ChatService.getUserChats(
    req.userId,
    parseInt(page),
    parseInt(limit)
  );

  ApiResponse.success(res, chats);
});

/**
 * Create or get one-to-one chat
 * POST /api/chats
 */
const createOrGetChat = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return ApiResponse.badRequest(res, "userId is required");
  }

  if (userId === req.userId.toString()) {
    return ApiResponse.badRequest(res, "Cannot create chat with yourself");
  }

  const chat = await ChatService.createOrGetOneToOneChat(req.userId, userId);

  ApiResponse.success(res, chat, "Chat created or retrieved successfully");
});

/**
 * Get chat by ID
 * GET /api/chats/:chatId
 */
const getChatById = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const chat = await ChatService.getChatById(chatId, req.userId);

  ApiResponse.success(res, chat);
});

/**
 * Delete chat
 * DELETE /api/chats/:chatId
 */
const deleteChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const result = await ChatService.deleteChat(chatId, req.userId);

  ApiResponse.success(res, result);
});

module.exports = {
  getUserChats,
  createOrGetChat,
  getChatById,
  deleteChat,
};
