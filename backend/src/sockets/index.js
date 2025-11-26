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
// Pending call timers keyed by `${fromUserId}:${targetUserId}` -> timeoutId
const pendingCallTimers = new Map();

// Helper to create a consistent key for pending calls (caller:callee)
function callKey(a, b) {
  return `${a}:${b}`;
}

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

    // Send connection confirmation to client
    socket.emit(SOCKET_EVENTS.AUTHENTICATED, {
      userId,
      socketId: socket.id,
      timestamp: new Date(),
    });

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

    // Event: Message delivered
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async (data) => {
      await this.handleMessageDelivered(socket, data);
    });

    // Event: Initiate call
    socket.on("call_initiate", (data, ack) => {
      // { targetUserId, callType: "video" | "audio" }
      const targetId = data.targetUserId;
      const forwarded = userSockets.has(targetId);
      if (!forwarded) {
        logger.warn(`[SOCKET] call_initiate: target ${targetId} not connected`);
        // notify caller that callee is unavailable
        socket.emit("call_unavailable", { targetUserId: targetId });
        if (ack) ack({ success: true, forwarded: false });
        return;
      }

      this.emitToUser(targetId, "call_initiate", {
        fromUserId: socket.userId,
        callType: data.callType,
      });

      // set a 30s timeout to notify both parties if unanswered
      try {
        const key = callKey(socket.userId, targetId);
        if (pendingCallTimers.has(key)) {
          clearTimeout(pendingCallTimers.get(key));
          pendingCallTimers.delete(key);
        }
        const t = setTimeout(() => {
          logger.info(
            `[SOCKET] call timeout for ${socket.userId} -> ${targetId}`
          );
          // notify both sides
          this.emitToUser(targetId, "call_timeout", {
            fromUserId: socket.userId,
          });
          this.emitToUser(socket.userId, "call_timeout", {
            targetUserId: targetId,
          });
          pendingCallTimers.delete(key);
        }, 30000);
        pendingCallTimers.set(key, t);
      } catch (e) {
        logger.error("Error scheduling call timeout:", e.message || e);
      }

      if (ack) ack({ success: true, forwarded: true });
    });

    // Event: Offer SDP
    socket.on("call_offer", (data, ack) => {
      // { targetUserId, offer }
      logger.info(
        `[SOCKET] CALL_OFFER received from ${socket.userId} for targetUserId ${data.targetUserId}`
      );
      logger.info(`[SOCKET] Offer payload: ${JSON.stringify(data.offer)}`);
      // Validate offer object
      if (!data || !data.offer || typeof data.offer !== "object" || !data.offer.type) {
        logger.warn("Invalid call_offer payload", data);
        if (ack) ack({ success: false, forwarded: false, error: "invalid_offer" });
        return;
      }
      const forwarded = userSockets.has(data.targetUserId);
      this.emitToUser(data.targetUserId, "call_offer", {
        fromUserId: socket.userId,
        offer: data.offer,
      });
      if (ack) ack({ success: true, forwarded });
    });

    // Event: Answer SDP
    socket.on("call_answer", (data, ack) => {
      // { targetUserId, answer }
      // Validate answer object
      if (!data || !data.answer || typeof data.answer !== "object" || !data.answer.type) {
        logger.warn("Invalid call_answer payload", data);
        if (ack) ack({ success: false, forwarded: false, error: "invalid_answer" });
        return;
      }
      const forwarded = userSockets.has(data.targetUserId);
      this.emitToUser(data.targetUserId, "call_answer", {
        fromUserId: socket.userId,
        answer: data.answer,
      });
      if (ack) ack({ success: true, forwarded });
    });

    // Event: ICE Candidate
    socket.on("call_ice_candidate", (data, ack) => {
      // { targetUserId, candidate }
      const forwarded = userSockets.has(data.targetUserId);
      this.emitToUser(data.targetUserId, "call_ice_candidate", {
        fromUserId: socket.userId,
        candidate: data.candidate,
      });
      if (ack) ack({ success: true, forwarded });
    });

    // Event: End call
    socket.on("call_end", (data, ack) => {
      // { targetUserId }
      const forwarded = userSockets.has(data.targetUserId);
      this.emitToUser(data.targetUserId, "call_end", {
        fromUserId: socket.userId,
      });
      if (ack) ack({ success: true, forwarded });
    });

    // Event: Call accepted by callee
    socket.on("call_accept", (data, ack) => {
      // data: { targetUserId } where targetUserId is the caller
      const callerId = data.targetUserId;
      const forwarded = userSockets.has(callerId);
      // forward to caller that callee accepted
      this.emitToUser(callerId, "call_accept", {
        fromUserId: socket.userId,
      });

      // clear any pending timeout between caller and callee
      try {
        const key = callKey(callerId, socket.userId);
        if (pendingCallTimers.has(key)) {
          clearTimeout(pendingCallTimers.get(key));
          pendingCallTimers.delete(key);
        }
      } catch (e) {
        logger.warn("Error clearing call timeout on accept:", e.message || e);
      }

      if (ack) ack({ success: true, forwarded });
    });

    // Event: Call rejected by callee
    socket.on("call_reject", (data, ack) => {
      // data: { targetUserId } where targetUserId is the caller
      const callerId = data.targetUserId;
      const forwarded = userSockets.has(callerId);
      this.emitToUser(callerId, "call_reject", {
        fromUserId: socket.userId,
      });

      // clear timeout
      try {
        const key = callKey(callerId, socket.userId);
        if (pendingCallTimers.has(key)) {
          clearTimeout(pendingCallTimers.get(key));
          pendingCallTimers.delete(key);
        }
      } catch (e) {
        logger.warn("Error clearing call timeout on reject:", e.message || e);
      }

      if (ack) ack({ success: true, forwarded });
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

      const joinedChats = [];
      const failedChats = [];

      // Verify user has access to each chat and join rooms
      for (const chatId of chatIds) {
        try {
          const chat = await ChatService.getChatById(chatId, socket.userId);
          socket.join(`chat:${chatId}`);
          joinedChats.push(chatId);
          logger.info(`User ${socket.userId} joined chat room: ${chatId}`);
        } catch (error) {
          failedChats.push({ chatId, error: error.message });
          logger.error(`Error joining chat ${chatId}:`, error.message);
        }
      }

      // Send acknowledgment
      socket.emit(SOCKET_EVENTS.CHATS_JOINED, {
        joined: joinedChats,
        failed: failedChats,
        timestamp: new Date(),
      });

      logger.info(
        `User ${socket.userId} joined ${joinedChats.length} chats, failed ${failedChats.length}`
      );
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

      // Ensure sender is in the chat room (auto-join if not)
      const rooms = Array.from(socket.rooms);
      const chatRoom = `chat:${chatId}`;
      if (!rooms.includes(chatRoom)) {
        try {
          const chat = await ChatService.getChatById(chatId, socket.userId);
          socket.join(chatRoom);
          logger.info(`User ${socket.userId} auto-joined chat room: ${chatId}`);
        } catch (error) {
          return socket.emit(SOCKET_EVENTS.ERROR, {
            message: "Unauthorized or chat not found",
          });
        }
      }

      // Create message (content is encrypted in MessageService)
      const message = await MessageService.createMessage(
        chatId,
        socket.userId,
        {
          type,
          content,
          meta,
        }
      );

      // Emit to all participants in the chat room (including sender)
      this.io.to(chatRoom).emit(SOCKET_EVENTS.NEW_MESSAGE, message);

      // Send acknowledgment to sender
      socket.emit(SOCKET_EVENTS.MESSAGE_SENT, {
        success: true,
        message,
        timestamp: new Date(),
      });

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
   * Handle message delivered
   */
  async handleMessageDelivered(socket, data) {
    try {
      const { messageId, chatId } = data;
      if (!messageId || !chatId) {
        return socket.emit(SOCKET_EVENTS.ERROR, {
          message: "messageId and chatId are required",
        });
      }
      // Update message status to delivered
      const message = await MessageService.updateMessageStatus(
        messageId,
        socket.userId,
        MESSAGE_STATUS.DELIVERED
      );
      // Broadcast to all participants
      this.io.to(`chat:${chatId}`).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
        messageId,
        chatId,
        userId: socket.userId,
        deliveredAt: message.deliveredAt,
      });
      logger.info(
        `Message ${messageId} marked as delivered by user ${socket.userId}`
      );
    } catch (error) {
      logger.error("Error in handleMessageDelivered:", error);
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

        // Clean up any pending call timers involving this user (caller or callee)
        try {
          for (const [key, timeout] of pendingCallTimers.entries()) {
            if (key.startsWith(`${userId}:`) || key.endsWith(`:${userId}`)) {
              try {
                clearTimeout(timeout);
              } catch (e) {
                logger.warn("Error clearing pending call timeout:", e.message || e);
              }
              pendingCallTimers.delete(key);
            }
          }
        } catch (e) {
          logger.warn("Error cleaning pendingCallTimers on disconnect:", e.message || e);
        }

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
      logger.info(
        `[SOCKET] emitToUser: Sending event '${event}' to userId ${userId} on sockets: ${Array.from(
          sockets
        ).join(",")}`
      );
      logger.info(`[SOCKET] emitToUser: Data: ${JSON.stringify(data)}`);
      sockets.forEach((socketId) => {
        this.io.to(socketId).emit(event, data);
      });
    } else {
      logger.warn(`[SOCKET] emitToUser: No sockets found for userId ${userId}`);
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
