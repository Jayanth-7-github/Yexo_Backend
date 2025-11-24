const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
      maxlength: [100, "Group name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
groupSchema.index({ members: 1 });
groupSchema.index({ admins: 1 });
groupSchema.index({ createdBy: 1 });

// Ensure creator is in admins and members
groupSchema.pre("save", function (next) {
  if (this.isNew) {
    // Add creator to admins if not already there
    if (!this.admins.some((adminId) => adminId.equals(this.createdBy))) {
      this.admins.push(this.createdBy);
    }

    // Add creator to members if not already there
    if (!this.members.some((memberId) => memberId.equals(this.createdBy))) {
      this.members.push(this.createdBy);
    }
  }
  next();
});

// Method to check if user is admin
groupSchema.methods.isAdmin = function (userId) {
  return this.admins.some((adminId) => adminId.equals(userId));
};

// Method to check if user is member
groupSchema.methods.isMember = function (userId) {
  return this.members.some((memberId) => memberId.equals(userId));
};

// Method to add member
groupSchema.methods.addMember = function (userId) {
  if (!this.isMember(userId)) {
    this.members.push(userId);
  }
};

// Method to remove member
groupSchema.methods.removeMember = function (userId) {
  this.members = this.members.filter((memberId) => !memberId.equals(userId));
  // Also remove from admins if present
  this.admins = this.admins.filter((adminId) => !adminId.equals(userId));
};

// Method to add admin
groupSchema.methods.addAdmin = function (userId) {
  if (this.isMember(userId) && !this.isAdmin(userId)) {
    this.admins.push(userId);
  }
};

// Method to remove admin
groupSchema.methods.removeAdmin = function (userId) {
  // Don't remove if it's the creator
  if (!userId.equals(this.createdBy)) {
    this.admins = this.admins.filter((adminId) => !adminId.equals(userId));
  }
};

const Group = mongoose.model("Group", groupSchema);

module.exports = Group;
