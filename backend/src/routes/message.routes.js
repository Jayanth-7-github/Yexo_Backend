const express = require("express");
const { body, query } = require("express-validator");
const messageController = require("../controllers/message.controller");
const FileService = require("../services/file.service");
const { authenticate } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const router = express.Router();

// Validation rules
const sendMessageValidation = [
  body("content")
    .notEmpty()
    .withMessage("Message content is required")
    .isString()
    .withMessage("Content must be a string"),
  body("type")
    .optional()
    .isIn(["text", "image", "video", "audio", "file"])
    .withMessage("Invalid message type"),
  body("meta").optional().isObject().withMessage("Meta must be an object"),
];

const updateStatusValidation = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["delivered", "seen"])
    .withMessage('Status must be either "delivered" or "seen"'),
];

const getMessagesValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("before")
    .optional()
    .isISO8601()
    .withMessage("Before must be a valid date"),
];

// File upload middleware
const upload = FileService.getUploadMiddleware();

// Routes
router.get(
  "/:chatId",
  authenticate,
  getMessagesValidation,
  validate,
  messageController.getChatMessages
);
router.post(
  "/:chatId",
  authenticate,
  sendMessageValidation,
  validate,
  messageController.sendMessage
);
router.patch(
  "/:messageId/status",
  authenticate,
  updateStatusValidation,
  validate,
  messageController.updateMessageStatus
);
router.post(
  "/upload",
  authenticate,
  upload.single("file"),
  messageController.uploadMedia
);
router.delete("/:messageId", authenticate, messageController.deleteMessage);

module.exports = router;
