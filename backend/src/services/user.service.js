const User = require("../models/User");

class UserService {
  /**
   * Search users by username, email, or phone
   */
  static async searchUsers(query, currentUserId, limit = 20) {
    const searchRegex = new RegExp(query, "i");

    const users = await User.find({
      _id: { $ne: currentUserId }, // Exclude current user
      $or: [
        { username: searchRegex },
        { email: searchRegex },
        { phoneNumber: searchRegex },
      ],
    })
      .select("-passwordHash")
      .limit(limit);

    return users.map((user) => user.getPublicProfile());
  }

  /**
   * Get user profile by ID
   */
  static async getUserProfile(userId) {
    const user = await User.findById(userId).select("-passwordHash");

    if (!user) {
      throw new Error("User not found");
    }

    return user.getPublicProfile();
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updates) {
    const allowedUpdates = [
      "avatarUrl",
      "statusMessage",
      "email",
      "phoneNumber",
    ];
    const updateData = {};

    // Filter allowed updates
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key) && updates[key] !== undefined) {
        updateData[key] = updates[key];
      }
    });

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    if (!user) {
      throw new Error("User not found");
    }

    return user.getPublicProfile();
  }

  /**
   * Update user online status
   */
  static async updateOnlineStatus(userId, isOnline) {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isOnline,
        lastSeenAt: new Date(),
      },
      { new: true }
    ).select("-passwordHash");

    return user;
  }

  /**
   * Get multiple users by IDs
   */
  static async getUsersByIds(userIds) {
    const users = await User.find({
      _id: { $in: userIds },
    }).select("-passwordHash");

    return users.map((user) => user.getPublicProfile());
  }

  /**
   * Check if username exists
   */
  static async usernameExists(username) {
    const user = await User.findOne({ username });
    return !!user;
  }
}

module.exports = UserService;
