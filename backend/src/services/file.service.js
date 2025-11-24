const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const config = require("../config/config");
const CryptoHelpers = require("../utils/cryptoHelpers");

class FileService {
  /**
   * Configure multer storage
   */
  static getStorage() {
    return multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), config.uploadPath);

        // Create directory if it doesn't exist
        try {
          await fs.mkdir(uploadDir, { recursive: true });
        } catch (error) {
          return cb(error);
        }

        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + "-" + CryptoHelpers.generateToken(8);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_");
        cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
      },
    });
  }

  /**
   * File filter for multer
   */
  static fileFilter(req, file, cb) {
    // Define allowed mime types
    const allowedTypes = [
      // Images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      // Videos
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/webm",
      // Audio
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // Archives
      "application/zip",
      "application/x-rar-compressed",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  }

  /**
   * Get multer upload middleware
   */
  static getUploadMiddleware() {
    return multer({
      storage: this.getStorage(),
      fileFilter: this.fileFilter,
      limits: {
        fileSize: config.maxFileSize,
      },
    });
  }

  /**
   * Delete file
   */
  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  /**
   * Get file URL (relative path for now, can be modified for cloud storage)
   */
  static getFileUrl(filename) {
    return `/uploads/${filename}`;
  }

  /**
   * Get message type from mime type
   */
  static getMessageTypeFromMime(mimetype) {
    if (mimetype.startsWith("image/")) return "image";
    if (mimetype.startsWith("video/")) return "video";
    if (mimetype.startsWith("audio/")) return "audio";
    return "file";
  }

  /**
   * Process uploaded file and return metadata
   */
  static processUploadedFile(file) {
    return {
      fileName: file.originalname,
      fileUrl: this.getFileUrl(file.filename),
      fileSize: file.size,
      mimeType: file.mimetype,
      type: this.getMessageTypeFromMime(file.mimetype),
    };
  }
}

module.exports = FileService;
