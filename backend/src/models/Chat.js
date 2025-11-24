const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    isGroup: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
chatSchema.index({ participants: 1 });
chatSchema.index({ isGroup: 1 });
chatSchema.index({ updatedAt: -1 }); // For sorting chats by recent activity

// Ensure one-to-one chats have exactly 2 participants
chatSchema.pre("save", function (next) {
  if (!this.isGroup && this.participants.length !== 2) {
    return next(new Error("One-to-one chat must have exactly 2 participants"));
  }
  next();
});

// Method to check if a user is a participant
chatSchema.methods.hasParticipant = function (userId) {
  return this.participants.some((participantId) =>
    participantId.equals(userId)
  );
};

// Static method to find or create one-to-one chat
chatSchema.statics.findOrCreateOneToOne = async function (user1Id, user2Id) {
  // Look for existing one-to-one chat
  let chat = await this.findOne({
    isGroup: false,
    participants: { $all: [user1Id, user2Id], $size: 2 },
  });

  // Create new chat if it doesn't exist
  if (!chat) {
    chat = await this.create({
      isGroup: false,
      participants: [user1Id, user2Id],
    });
  }

  return chat;
};

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
