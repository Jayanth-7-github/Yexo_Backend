const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");

class ChatService {
  /**
   * Get all chats for a user
   */
  static async getUserChats(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const chats = await Chat.find({
      participants: userId,
    })
      .populate("participants", "username avatarUrl isOnline lastSeenAt")
      .populate("group", "name avatarUrl description")
      .populate({
        path: "lastMessage",
        select: "contentEncrypted iv authTag type sender createdAt status",
        populate: {
          path: "sender",
          select: "username",
        },
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    return chats;
  }

  /**
   * Create or get one-to-one chat
   */
  static async createOrGetOneToOneChat(user1Id, user2Id) {
    // Validate that both users exist
    const user2 = await User.findById(user2Id);
    if (!user2) {
      throw new Error("User not found");
    }

    // Use the static method from Chat model
    const chat = await Chat.findOrCreateOneToOne(user1Id, user2Id);

    // Populate participants
    await chat.populate(
      "participants",
      "username avatarUrl isOnline lastSeenAt"
    );

    return chat;
  }

  /**
   * Get chat by ID
   */
  static async getChatById(chatId, userId) {
    const chat = await Chat.findById(chatId)
      .populate(
        "participants",
        "username avatarUrl isOnline lastSeenAt statusMessage"
      )
      .populate("group", "name avatarUrl description admins members createdBy");

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Verify user is a participant
    if (!chat.hasParticipant(userId)) {
      throw new Error("Unauthorized access to chat");
    }

    return chat;
  }

  /**
   * Delete/archive chat
   */
  static async deleteChat(chatId, userId) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new Error("Chat not found");
    }

    // Verify user is a participant
    if (!chat.hasParticipant(userId)) {
      throw new Error("Unauthorized access to chat");
    }

    // For one-to-one chats, we can delete
    // For group chats, this should probably just remove the user from the group
    if (!chat.isGroup) {
      await Chat.findByIdAndDelete(chatId);
      // Optionally delete all messages in this chat
      await Message.deleteMany({ chat: chatId });
    } else {
      throw new Error("Use group leave endpoint for group chats");
    }

    return { message: "Chat deleted successfully" };
  }

  /**
   * Update last message for a chat
   */
  static async updateLastMessage(chatId, messageId) {
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: messageId,
      updatedAt: new Date(),
    });
  }

  /**
   * Get chat participants' socket IDs (helper for socket events)
   */
  static async getChatParticipants(chatId) {
    const chat = await Chat.findById(chatId).populate("participants", "_id");
    if (!chat) {
      return [];
    }
    return chat.participants.map((p) => p._id.toString());
  }
}

module.exports = ChatService;
