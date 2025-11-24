const crypto = require("crypto");
const config = require("../config/config");

/**
 * Crypto helper utilities for encryption/decryption
 * Uses AES-256-GCM for authenticated encryption
 */

class CryptoHelpers {
  /**
   * Encrypt text using AES-256-GCM
   * @param {string} plainText - Text to encrypt
   * @returns {object} - { cipherText, iv, authTag }
   */
  static encryptText(plainText) {
    try {
      // Ensure key is exactly 32 bytes
      const key = Buffer.from(
        config.encryption.key.padEnd(32, "0").slice(0, 32),
        "utf8"
      );

      // Generate random IV (initialization vector)
      const iv = crypto.randomBytes(config.encryption.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

      // Encrypt the text
      let encrypted = cipher.update(plainText, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get auth tag for GCM mode
      const authTag = cipher.getAuthTag();

      return {
        cipherText: encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
      };
    } catch (error) {
      throw new Error("Encryption failed: " + error.message);
    }
  }

  /**
   * Decrypt text using AES-256-GCM
   * @param {string} cipherText - Encrypted text
   * @param {string} iv - Initialization vector (hex string)
   * @param {string} authTag - Authentication tag (hex string)
   * @returns {string} - Decrypted plain text
   */
  static decryptText(cipherText, iv, authTag) {
    try {
      // Ensure key is exactly 32 bytes
      const key = Buffer.from(
        config.encryption.key.padEnd(32, "0").slice(0, 32),
        "utf8"
      );

      // Create decipher
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(iv, "hex")
      );

      // Set auth tag
      decipher.setAuthTag(Buffer.from(authTag, "hex"));

      // Decrypt the text
      let decrypted = decipher.update(cipherText, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new Error("Decryption failed: " + error.message);
    }
  }

  /**
   * Generate a random token
   * @param {number} length - Token length in bytes (default 32)
   * @returns {string} - Random hex string
   */
  static generateToken(length = 32) {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Hash a string using SHA-256
   * @param {string} text - Text to hash
   * @returns {string} - Hash hex string
   */
  static hash(text) {
    return crypto.createHash("sha256").update(text).digest("hex");
  }
}

module.exports = CryptoHelpers;
