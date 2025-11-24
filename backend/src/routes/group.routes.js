const express = require("express");
const { body } = require("express-validator");
const groupController = require("../controllers/group.controller");
const { authenticate } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");

const router = express.Router();

// Validation rules
const createGroupValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Group name is required")
    .isLength({ max: 100 })
    .withMessage("Group name cannot exceed 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("avatarUrl").optional().isURL().withMessage("Avatar URL must be valid"),
  body("memberIds")
    .optional()
    .isArray()
    .withMessage("memberIds must be an array"),
];

const updateGroupValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Group name must be between 1 and 100 characters"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("avatarUrl").optional().isURL().withMessage("Avatar URL must be valid"),
];

const addMembersValidation = [
  body("memberIds")
    .isArray({ min: 1 })
    .withMessage("memberIds must be a non-empty array"),
];

const makeAdminValidation = [
  body("userId")
    .notEmpty()
    .withMessage("userId is required")
    .isMongoId()
    .withMessage("Invalid user ID"),
];

// Routes
router.post(
  "/",
  authenticate,
  createGroupValidation,
  validate,
  groupController.createGroup
);
router.get("/", authenticate, groupController.getUserGroups);
router.get("/:groupId", authenticate, groupController.getGroupById);
router.patch(
  "/:groupId",
  authenticate,
  updateGroupValidation,
  validate,
  groupController.updateGroup
);
router.post(
  "/:groupId/members",
  authenticate,
  addMembersValidation,
  validate,
  groupController.addMembers
);
router.delete(
  "/:groupId/members/:memberId",
  authenticate,
  groupController.removeMember
);
router.post("/:groupId/leave", authenticate, groupController.leaveGroup);
router.post(
  "/:groupId/admins",
  authenticate,
  makeAdminValidation,
  validate,
  groupController.makeAdmin
);
router.delete(
  "/:groupId/admins/:userId",
  authenticate,
  groupController.removeAdmin
);
router.delete("/:groupId", authenticate, groupController.deleteGroup);

module.exports = router;
