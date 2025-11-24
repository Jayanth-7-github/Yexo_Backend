const express = require("express");
const { query, body } = require("express-validator");
const userController = require("../controllers/user.controller");
const { authenticate } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const router = express.Router();

// Validation rules
const searchValidation = [
  query("q")
    .trim()
    .notEmpty()
    .withMessage("Search query is required")
    .isLength({ min: 1 })
    .withMessage("Search query must be at least 1 character"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

const updateProfileValidation = [
  body("avatarUrl")
    .optional()
    .isURL()
    .withMessage("Avatar URL must be a valid URL"),
  body("statusMessage")
    .optional()
    .isLength({ max: 150 })
    .withMessage("Status message cannot exceed 150 characters"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email"),
  body("phoneNumber")
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid phone number"),
];

// Routes - Specific routes MUST come before parameterized routes
router.get("/me", authenticate, userController.getMyProfile);
router.patch(
  "/me",
  authenticate,
  updateProfileValidation,
  validate,
  userController.updateMyProfile
);
router.get(
  "/search",
  authenticate,
  searchValidation,
  validate,
  userController.searchUsers
);
router.get("/:id", authenticate, userController.getUserProfile);

module.exports = router;
