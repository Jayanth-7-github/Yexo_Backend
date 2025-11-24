const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    createdByIp: {
      type: String,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedByIp: {
      type: String,
    },
    replacedByToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index for automatic cleanup of expired tokens (handled by MongoDB)
// Note: The individual field indexes are already created by unique: true

// Virtual to check if token is expired
refreshTokenSchema.virtual("isExpired").get(function () {
  return Date.now() >= this.expiresAt.getTime();
});

// Virtual to check if token is active
refreshTokenSchema.virtual("isActive").get(function () {
  return !this.revokedAt && !this.isExpired;
});

// Method to revoke token
refreshTokenSchema.methods.revoke = function (ip, replacedByToken = null) {
  this.revokedAt = new Date();
  this.revokedByIp = ip;
  if (replacedByToken) {
    this.replacedByToken = replacedByToken;
  }
};

// Static method to clean up expired/revoked tokens for a user
refreshTokenSchema.statics.cleanupUserTokens = async function (userId) {
  return this.deleteMany({
    user: userId,
    $or: [{ expiresAt: { $lt: new Date() } }, { revokedAt: { $ne: null } }],
  });
};

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = RefreshToken;
