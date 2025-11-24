const Message = require("../models/Message");
const Chat = require("../models/Chat");
const EncryptionService = require("./encryption.service");
const { PAGINATION, MESSAGE_STATUS } = require("../utils/constants");

class MessageService {
  /**
   * Get messages for a chat with pagination
   */
  static async getChatMessages(chatId, userId, options = {}) {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = PAGINATION.DEFAULT_LIMIT,
      before = null, // For loading older messages
    } = options;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    if (!chat.hasParticipant(userId)) {
      throw new Error("Unauthorized access to chat");
    }

    // Build query
    const query = { chat: chatId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const skip = (page - 1) * limit;

    // Get messages
    const messages = await Message.find(query)
      .populate("sender", "username avatarUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(limit, PAGINATION.MAX_LIMIT));

    // Decrypt messages
    const decryptedMessages = messages.map((msg) => {
      const messageObj = msg.toObject();
      try {
        messageObj.content = EncryptionService.getDecryptedContent(msg);
      } catch (error) {
        messageObj.content = "[Unable to decrypt message]";
      }

      // Remove encrypted fields from response
      delete messageObj.contentEncrypted;
      delete messageObj.iv;
      delete messageObj.authTag;

      return messageObj;
    });

    return decryptedMessages.reverse(); // Return in chronological order
  }

  /**
   * Create a new message
   */
  static async createMessage(chatId, senderId, messageData) {
    const { type, content, meta } = messageData;

    // Verify chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }

    if (!chat.hasParticipant(senderId)) {
      throw new Error("Unauthorized to send message to this chat");
    }

    // Encrypt message content
    const encryptedData = EncryptionService.prepareEncryptedContent(content);

    // Create message
    const message = new Message({
      chat: chatId,
      sender: senderId,
      type,
      ...encryptedData,
      meta: meta || {},
      status: MESSAGE_STATUS.SENT,
      sentAt: new Date(),
    });

    await message.save();

    // Update chat's last message
    chat.lastMessage = message._id;
    chat.updatedAt = new Date();
    await chat.save();

    // Populate sender info
    await message.populate("sender", "username avatarUrl");

    // Return message with decrypted content
    const messageObj = message.toObject();
    messageObj.content = content; // Use original content (already decrypted)
    delete messageObj.contentEncrypted;
    delete messageObj.iv;
    delete messageObj.authTag;

    return messageObj;
  }

  /**
   * Update message status (delivered/seen)
   */
  static async updateMessageStatus(messageId, userId, status) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Verify user has access to this message's chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.hasParticipant(userId)) {
      throw new Error("Unauthorized");
    }

    // Don't update if user is the sender
    if (message.sender.equals(userId)) {
      return message;
    }

    // Update status
    if (status === MESSAGE_STATUS.DELIVERED) {
      message.markAsDelivered();
    } else if (status === MESSAGE_STATUS.SEEN) {
      message.markAsSeen(userId);
    }

    await message.save();

    return message;
  }

  /**
   * Mark all messages in a chat as delivered for a user
   */
  static async markChatMessagesAsDelivered(chatId, userId) {
    const result = await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: userId },
        status: MESSAGE_STATUS.SENT,
      },
      {
        status: MESSAGE_STATUS.DELIVERED,
        deliveredAt: new Date(),
      }
    );

    return result;
  }

  /**
   * Mark all messages in a chat as seen for a user
   */
  static async markChatMessagesAsSeen(chatId, userId) {
    const messages = await Message.find({
      chat: chatId,
      sender: { $ne: userId },
      status: { $ne: MESSAGE_STATUS.SEEN },
    });

    for (const message of messages) {
      message.markAsSeen(userId);
      await message.save();
    }

    return messages;
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId, userId) {
    const message = await Message.findById(messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Only sender can delete their message
    if (!message.sender.equals(userId)) {
      throw new Error("Unauthorized to delete this message");
    }

    await Message.findByIdAndDelete(messageId);

    return { message: "Message deleted successfully" };
  }
}

module.exports = MessageService;
