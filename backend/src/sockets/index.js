const socketIO = require("socket.io");
const AuthService = require("../services/auth.service");
const UserService = require("../services/user.service");
const MessageService = require("../services/message.service");
const ChatService = require("../services/chat.service");
const EncryptionService = require("../services/encryption.service");
const { SOCKET_EVENTS, MESSAGE_STATUS } = require("../utils/constants");
const logger = require("../utils/logger");
const config = require("../config/config");

// Store socket ID to user ID mapping
const userSockets = new Map(); // userId -> Set of socketIds
const socketUsers = new Map(); // socketId -> userId

class SocketService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize Socket.IO
   */
  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: "*", // Allow all origins
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        // Verify token
        const payload = AuthService.verifyAccessToken(token);
        const user = await AuthService.getUserById(payload.userId);

        // Attach user to socket
        socket.userId = user._id.toString();
        socket.user = user;

        next();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Socket authentication error: ${errorMsg}`);
        next(new Error("Authentication failed"));
      }
    });

    // Connection event
    this.io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
      this.handleConnection(socket);
    });

    logger.info("Socket.IO initialized");
    return this.io;
  }

  /**
   * Handle new socket connection
   */
  async handleConnection(socket) {
    const userId = socket.userId;
    logger.info(`User connected: ${userId} (Socket: ${socket.id})`);

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    socketUsers.set(socket.id, userId);

    // Update user online status
    await UserService.updateOnlineStatus(userId, true);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Emit user online to contacts (broadcast to all connected users for now)
    socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId,
      timestamp: new Date(),
    });

    // Event: Join chat rooms
    socket.on(SOCKET_EVENTS.JOIN_CHATS, async (data) => {
      await this.handleJoinChats(socket, data);
    });

    // Event: Send message
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Event: Typing indicator
    socket.on(SOCKET_EVENTS.TYPING, (data) => {
      this.handleTyping(socket, data);
    });

    // Event: Stop typing
    socket.on(SOCKET_EVENTS.STOP_TYPING, (data) => {
      this.handleStopTyping(socket, data);
    });

    // Event: Message seen
    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, async (data) => {
      await this.handleMessageSeen(socket, data);
    });

    // Event: Disconnect
    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      await this.handleDisconnect(socket);
    });
  }

  /**
   * Handle joining chat rooms
   */
  async handleJoinChats(socket, data) {
    try {
      const { chatIds } = data;

      if (!Array.isArray(chatIds)) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatIds must be an array",
        });
      }

      // Verify user has access to each chat and join rooms
      for (const chatId of chatIds) {
        try {
          const chat = await ChatService.getChatById(chatId, socket.userId);
          socket.join(`chat:${chatId}`);
          logger.info(`User ${socket.userId} joined chat room: ${chatId}`);
        } catch (error) {
          logger.error(`Error joining chat ${chatId}:`, error.message);
        }
      }
    } catch (error) {
      logger.error("Error in handleJoinChats:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle sending message
   */
  async handleSendMessage(socket, data) {
    try {
      const { chatId, type = "text", content, meta } = data;

      if (!chatId || !content) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatId and content are required",
        });
      }

      // Create message
      const message = await MessageService.createMessage(
        chatId,
        socket.userId,
        {
          type,
          content,
          meta,
        }
      );

      // Emit to all participants in the chat room
      this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, message);

      logger.info(`Message sent in chat ${chatId} by user ${socket.userId}`);
    } catch (error) {
      logger.error("Error in handleSendMessage:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle typing indicator
   */
  handleTyping(socket, data) {
    try {
      const { chatId, isTyping } = data;

      if (!chatId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatId is required",
        });
      }

      // Broadcast to other participants in the chat
      socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.TYPING, {
        chatId,
        userId: socket.userId,
        username: socket.user.username,
        isTyping: isTyping !== false,
      });
    } catch (error) {
      logger.error("Error in handleTyping:", error);
    }
  }

  /**
   * Handle stop typing
   */
  handleStopTyping(socket, data) {
    try {
      const { chatId } = data;

      if (!chatId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "chatId is required",
        });
      }

      socket.to(`chat:${chatId}`).emit(SOCKET_EVENTS.STOP_TYPING, {
        chatId,
        userId: socket.userId,
        username: socket.user.username,
      });
    } catch (error) {
      logger.error("Error in handleStopTyping:", error);
    }
  }

  /**
   * Handle message seen
   */
  async handleMessageSeen(socket, data) {
    try {
      const { messageId, chatId } = data;

      if (!messageId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "messageId is required",
        });
      }

      // Update message status
      const message = await MessageService.updateMessageStatus(
        messageId,
        socket.userId,
        MESSAGE_STATUS.SEEN
      );

      // Emit to all participants
      this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.MESSAGE_SEEN, {
        messageId,
        chatId,
        userId: socket.userId,
        seenAt: message.seenAt,
      });

      logger.info(
        `Message ${messageId} marked as seen by user ${socket.userId}`
      );
    } catch (error) {
      logger.error("Error in handleMessageSeen:", error);
      socket.emit(SOCKET_EVENTS.ERROR, { message: error.message });
    }
  }

  /**
   * Handle disconnect
   */
  async handleDisconnect(socket) {
    const userId = socket.userId;
    logger.info(`User disconnected: ${userId} (Socket: ${socket.id})`);

    // Remove socket from tracking
    if (userSockets.has(userId)) {
      userSockets.get(userId).delete(socket.id);

      // If user has no more active sockets, mark as offline
      if (userSockets.get(userId).size === 0) {
        userSockets.delete(userId);

        // Update user offline status
        await UserService.updateOnlineStatus(userId, false);

        // Emit user offline
        socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
          userId,
          lastSeenAt: new Date(),
        });
      }
    }

    socketUsers.delete(socket.id);
  }

  /**
   * Emit event to specific user
   */
  emitToUser(userId, event, data) {
    if (userSockets.has(userId)) {
      const sockets = userSockets.get(userId);
      sockets.forEach((socketId) => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Emit event to chat room
   */
  emitToChat(chatId, event, data) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    if (!this.io) {
      throw new Error("Socket.IO not initialized");
    }
    return this.io;
  }
}

// Export singleton instance
module.exports = new SocketService();
