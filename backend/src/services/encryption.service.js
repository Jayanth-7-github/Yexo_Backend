const CryptoHelpers = require("../utils/cryptoHelpers");

/**
 * Encryption service for message content
 * Uses AES-256-GCM for authenticated encryption
 */
class EncryptionService {
  /**
   * Encrypt message content
   * @param {string} plainText - Plain text message
   * @returns {object} - { contentEncrypted, iv, authTag }
   */
  static encryptMessage(plainText) {
    if (!plainText || typeof plainText !== "string") {
      throw new Error("Invalid message content for encryption");
    }

    return CryptoHelpers.encryptText(plainText);
  }

  /**
   * Decrypt message content
   * @param {string} cipherText - Encrypted message
   * @param {string} iv - Initialization vector
   * @param {string} authTag - Authentication tag
   * @returns {string} - Decrypted plain text
   */
  static decryptMessage(cipherText, iv, authTag) {
    if (!cipherText || !iv || !authTag) {
      throw new Error("Missing required decryption parameters");
    }

    return CryptoHelpers.decryptText(cipherText, iv, authTag);
  }

  /**
   * Encrypt a message object (used in services/controllers)
   * @param {string} content - Message content to encrypt
   * @returns {object} - Encrypted message data ready for DB storage
   */
  static prepareEncryptedContent(content) {
    const encrypted = this.encryptMessage(content);
    return {
      contentEncrypted: encrypted.cipherText,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    };
  }

  /**
   * Decrypt message content from DB document
   * @param {object} messageDoc - Message document with encrypted fields
   * @returns {string} - Decrypted content
   */
  static getDecryptedContent(messageDoc) {
    try {
      return this.decryptMessage(
        messageDoc.contentEncrypted,
        messageDoc.iv,
        messageDoc.authTag
      );
    } catch (error) {
      // Log error but don't expose decryption failure details
      return "[Decryption failed]";
    }
  }
}

module.exports = EncryptionService;
