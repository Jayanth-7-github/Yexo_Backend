const express = require("express");
const { body, query } = require("express-validator");
const chatController = require("../controllers/chat.controller");
const { authenticate } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const router = express.Router();

// Validation rules
const createChatValidation = [
  body("userId")
    .notEmpty()
    .withMessage("userId is required")
    .isMongoId()
    .withMessage("Invalid user ID"),
];

const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

// Routes
router.get(
  "/",
  authenticate,
  paginationValidation,
  validate,
  chatController.getUserChats
);
router.post(
  "/",
  authenticate,
  createChatValidation,
  validate,
  chatController.createOrGetChat
);
router.get("/:chatId", authenticate, chatController.getChatById);
router.delete("/:chatId", authenticate, chatController.deleteChat);

module.exports = router;
