const jwt = require("jsonwebtoken");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const config = require("../config/config");

class AuthService {
  /**
   * Register a new user
   */
  static async register(userData) {
    const { username, password, email, phoneNumber } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username },
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new Error("Username already exists");
      }
      if (email && existingUser.email === email) {
        throw new Error("Email already exists");
      }
      if (phoneNumber && existingUser.phoneNumber === phoneNumber) {
        throw new Error("Phone number already exists");
      }
    }

    // Create new user (password will be hashed by pre-save hook)
    const user = new User({
      username,
      passwordHash: password, // Will be hashed by model
      email: email || undefined,
      phoneNumber: phoneNumber || undefined,
    });

    await user.save();

    // Generate tokens
    const tokens = await this.generateTokens(user._id);

    return {
      user: user.getPublicProfile(),
      ...tokens,
    };
  }

  /**
   * Login user
   */
  static async login(credentials, ipAddress) {
    const { username, password } = credentials;

    // Find user by username, email, or phone
    const user = await User.findOne({
      $or: [{ username }, { email: username }, { phoneNumber: username }],
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Generate tokens
    const tokens = await this.generateTokens(user._id, ipAddress);

    // Update user status
    user.isOnline = true;
    user.lastSeenAt = new Date();
    await user.save();

    return {
      user: user.getPublicProfile(),
      ...tokens,
    };
  }

  /**
   * Generate access and refresh tokens
   */
  static async generateTokens(userId, ipAddress = null) {
    // Generate access token
    const accessToken = jwt.sign({ userId }, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
    });

    // Generate refresh token
    const refreshToken = jwt.sign({ userId }, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    // Calculate expiry date for refresh token
    const expiresAt = new Date();
    const expiryDays = parseInt(config.jwt.refreshExpiresIn) || 7;
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Store refresh token in database
    await RefreshToken.create({
      token: refreshToken,
      user: userId,
      expiresAt,
      createdByIp: ipAddress,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshTokenString, ipAddress) {
    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(refreshTokenString, config.jwt.refreshSecret);
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }

    // Find refresh token in database
    const refreshTokenDoc = await RefreshToken.findOne({
      token: refreshTokenString,
      user: payload.userId,
    });

    if (!refreshTokenDoc || !refreshTokenDoc.isActive) {
      throw new Error("Invalid or expired refresh token");
    }

    // Generate new tokens
    const newTokens = await this.generateTokens(payload.userId, ipAddress);

    // Revoke old refresh token
    refreshTokenDoc.revoke(ipAddress, newTokens.refreshToken);
    await refreshTokenDoc.save();

    return newTokens;
  }

  /**
   * Logout user (revoke refresh token)
   */
  static async logout(refreshTokenString, ipAddress) {
    const refreshTokenDoc = await RefreshToken.findOne({
      token: refreshTokenString,
    });

    if (refreshTokenDoc && refreshTokenDoc.isActive) {
      refreshTokenDoc.revoke(ipAddress);
      await refreshTokenDoc.save();
    }
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.accessSecret);
    } catch (error) {
      throw new Error("Invalid or expired access token");
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user.getPublicProfile();
  }
}

module.exports = AuthService;
