require("dotenv").config();

const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",

  // Database
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/chat_app",

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "your_access_secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "your_refresh_secret",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || "12345678901234567890123456789012", // Must be 32 bytes
    ivLength: parseInt(process.env.ENCRYPTION_IV_LENGTH) || 16,
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",

  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
  uploadPath: process.env.UPLOAD_PATH || "./uploads",
};

// Validate required environment variables in production
if (config.nodeEnv === "production") {
  const requiredEnvVars = [
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "ENCRYPTION_KEY",
    "MONGODB_URI",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
  }

  // Validate encryption key length
  if (config.encryption.key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 characters for AES-256");
  }
}

module.exports = config;
