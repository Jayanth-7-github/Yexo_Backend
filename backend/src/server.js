const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const socketService = require("./sockets");
const config = require("./config/config");
const logger = require("./utils/logger");

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...", error);
  process.exit(1);
});

// Main server startup function
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize Socket.IO
    socketService.initialize(server);

    // Start listening
    const PORT = config.port;
    server.listen(PORT, () => {
      logger.info("===========================================");
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📝 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 CORS enabled for: ${config.corsOrigin}`);
      logger.info(`📡 Socket.IO enabled`);
      logger.info(`🔒 Encryption: AES-256-GCM`);
      logger.info("===========================================");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (error) => {
      logger.error("UNHANDLED REJECTION! Shutting down...", error);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info("Shutting down gracefully...");
      server.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forcing shutdown...");
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
