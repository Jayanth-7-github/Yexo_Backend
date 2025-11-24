const MessageService = require("../services/message.service");
const FileService = require("../services/file.service");
const ApiResponse = require("../utils/response");
const { asyncHandler } = require("../middleware/error.middleware");

/**
 * Get messages for a chat
 * GET /api/messages/:chatId
 */
const getChatMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { page, limit, before } = req.query;

  const messages = await MessageService.getChatMessages(chatId, req.userId, {
    page: page ? parseInt(page) : undefined,
    limit: limit ? parseInt(limit) : undefined,
    before,
  });

  ApiResponse.success(res, messages);
});

/**
 * Send a message
 * POST /api/messages/:chatId
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { type = "text", content, meta } = req.body;

  if (!content || content.trim().length === 0) {
    return ApiResponse.badRequest(res, "Message content is required");
  }

  const message = await MessageService.createMessage(chatId, req.userId, {
    type,
    content,
    meta,
  });

  ApiResponse.created(res, message, "Message sent successfully");
});

/**
 * Update message status
 * PATCH /api/messages/:messageId/status
 */
const updateMessageStatus = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { status } = req.body;

  if (!["delivered", "seen"].includes(status)) {
    return ApiResponse.badRequest(
      res,
      'Invalid status. Must be "delivered" or "seen"'
    );
  }

  const message = await MessageService.updateMessageStatus(
    messageId,
    req.userId,
    status
  );

  ApiResponse.success(res, message, "Message status updated");
});

/**
 * Upload media file
 * POST /api/messages/upload
 */
const uploadMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest(res, "No file uploaded");
  }

  const fileData = FileService.processUploadedFile(req.file);

  ApiResponse.success(res, fileData, "File uploaded successfully");
});

/**
 * Upload multiple media files
 * POST /api/messages/upload-multiple
 */
const uploadMultipleMedia = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return ApiResponse.badRequest(res, "No files uploaded");
  }

  const filesData = req.files.map((file) =>
    FileService.processUploadedFile(file)
  );

  ApiResponse.success(
    res,
    filesData,
    `${filesData.length} files uploaded successfully`
  );
});

/**
 * Delete message
 * DELETE /api/messages/:messageId
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const result = await MessageService.deleteMessage(messageId, req.userId);

  ApiResponse.success(res, result);
});

/**
 * Mark all messages in a chat as seen
 * PATCH /api/messages/chat/:chatId/mark-seen
 */
const markChatAsSeen = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  const messages = await MessageService.markChatMessagesAsSeen(
    chatId,
    req.userId
  );

  ApiResponse.success(
    res,
    { count: messages.length },
    "Messages marked as seen"
  );
});

module.exports = {
  getChatMessages,
  sendMessage,
  updateMessageStatus,
  uploadMedia,
  uploadMultipleMedia,
  deleteMessage,
  markChatAsSeen,
};
