const mongoose = require("mongoose");
const { MESSAGE_TYPE, MESSAGE_STATUS } = require("../utils/constants");

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: [true, "Chat reference is required"],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender is required"],
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.TEXT,
      required: true,
    },
    // Encrypted message content
    contentEncrypted: {
      type: String,
      required: [true, "Message content is required"],
    },
    // Initialization vector for decryption
    iv: {
      type: String,
      required: [true, "IV is required for decryption"],
    },
    // Auth tag for GCM mode
    authTag: {
      type: String,
      required: [true, "Auth tag is required for decryption"],
    },
    // Metadata for media messages
    meta: {
      fileName: String,
      fileUrl: String,
      fileSize: Number,
      mimeType: String,
      duration: Number, // For audio/video
      thumbnailUrl: String, // For images/videos
      width: Number, // For images/videos
      height: Number, // For images/videos
    },
    status: {
      type: String,
      enum: Object.values(MESSAGE_STATUS),
      default: MESSAGE_STATUS.SENT,
    },
    // Array of users who have seen the message (for group chats)
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    sentAt: {
      type: Date,
      default: Date.now,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    seenAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
messageSchema.index({ chat: 1, createdAt: -1 }); // Get messages for a chat, sorted by time
messageSchema.index({ sender: 1, createdAt: -1 }); // Get messages by sender
messageSchema.index({ status: 1 }); // Filter by status

// Virtual property to check if message is seen
messageSchema.virtual("isSeen").get(function () {
  return this.status === MESSAGE_STATUS.SEEN;
});

// Method to mark as delivered
messageSchema.methods.markAsDelivered = function () {
  if (this.status === MESSAGE_STATUS.SENT) {
    this.status = MESSAGE_STATUS.DELIVERED;
    this.deliveredAt = new Date();
  }
};

// Method to mark as seen
messageSchema.methods.markAsSeen = function (userId) {
  if (this.status !== MESSAGE_STATUS.SEEN) {
    this.status = MESSAGE_STATUS.SEEN;
    this.seenAt = new Date();
  }

  // Add user to seenBy if not already there
  if (userId && !this.seenBy.some((id) => id.equals(userId))) {
    this.seenBy.push(userId);
  }
};

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
