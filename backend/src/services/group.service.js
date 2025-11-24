const Group = require("../models/Group");
const Chat = require("../models/Chat");
const User = require("../models/User");

class GroupService {
  /**
   * Create a new group
   */
  static async createGroup(creatorId, groupData) {
    const { name, description, avatarUrl, memberIds = [] } = groupData;

    // Validate that all members exist
    const members = await User.find({ _id: { $in: memberIds } });
    if (members.length !== memberIds.length) {
      throw new Error("One or more members not found");
    }

    // Create group
    const group = new Group({
      name,
      description,
      avatarUrl,
      createdBy: creatorId,
      admins: [creatorId],
      members: [
        creatorId,
        ...memberIds.filter((id) => id !== creatorId.toString()),
      ],
    });

    await group.save();

    // Create associated chat
    const chat = new Chat({
      isGroup: true,
      participants: group.members,
      group: group._id,
    });

    await chat.save();

    // Populate group data
    await group.populate("members", "username avatarUrl isOnline");
    await group.populate("admins", "username avatarUrl");

    return { group, chat };
  }

  /**
   * Get all groups for a user
   */
  static async getUserGroups(userId) {
    const groups = await Group.find({
      members: userId,
    })
      .populate("members", "username avatarUrl isOnline")
      .populate("admins", "username avatarUrl")
      .populate("createdBy", "username avatarUrl")
      .sort({ createdAt: -1 });

    return groups;
  }

  /**
   * Get group by ID
   */
  static async getGroupById(groupId, userId) {
    const group = await Group.findById(groupId)
      .populate("members", "username avatarUrl isOnline lastSeenAt")
      .populate("admins", "username avatarUrl")
      .populate("createdBy", "username avatarUrl");

    if (!group) {
      throw new Error("Group not found");
    }

    // Verify user is a member
    if (!group.isMember(userId)) {
      throw new Error("Unauthorized access to group");
    }

    return group;
  }

  /**
   * Update group info (name, description, avatar)
   */
  static async updateGroup(groupId, userId, updates) {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Only admins can update group
    if (!group.isAdmin(userId)) {
      throw new Error("Only admins can update group information");
    }

    // Update allowed fields
    const allowedUpdates = ["name", "description", "avatarUrl"];
    Object.keys(updates).forEach((key) => {
      if (allowedUpdates.includes(key) && updates[key] !== undefined) {
        group[key] = updates[key];
      }
    });

    await group.save();
    await group.populate("members", "username avatarUrl isOnline");
    await group.populate("admins", "username avatarUrl");

    return group;
  }

  /**
   * Add members to group
   */
  static async addMembers(groupId, adminId, memberIds) {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Only admins can add members
    if (!group.isAdmin(adminId)) {
      throw new Error("Only admins can add members");
    }

    // Validate members exist
    const members = await User.find({ _id: { $in: memberIds } });
    if (members.length !== memberIds.length) {
      throw new Error("One or more users not found");
    }

    // Add members
    memberIds.forEach((memberId) => {
      group.addMember(memberId);
    });

    await group.save();

    // Update associated chat
    await Chat.findOneAndUpdate(
      { group: groupId },
      { participants: group.members }
    );

    await group.populate("members", "username avatarUrl isOnline");

    return group;
  }

  /**
   * Remove member from group
   */
  static async removeMember(groupId, adminId, memberId) {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Only admins can remove members
    if (!group.isAdmin(adminId)) {
      throw new Error("Only admins can remove members");
    }

    // Cannot remove the creator
    if (memberId === group.createdBy.toString()) {
      throw new Error("Cannot remove group creator");
    }

    group.removeMember(memberId);
    await group.save();

    // Update associated chat
    await Chat.findOneAndUpdate(
      { group: groupId },
      { participants: group.members }
    );

    await group.populate("members", "username avatarUrl isOnline");

    return group;
  }

  /**
   * Leave group
   */
  static async leaveGroup(groupId, userId) {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Creator cannot leave (must delete group instead)
    if (userId.equals(group.createdBy)) {
      throw new Error("Group creator cannot leave. Delete the group instead.");
    }

    group.removeMember(userId);
    await group.save();

    // Update associated chat
    await Chat.findOneAndUpdate(
      { group: groupId },
      { participants: group.members }
    );

    return { message: "Left group successfully" };
  }

  /**
   * Make user admin
   */
  static async makeAdmin(groupId, adminId, userId) {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Only admins can make other users admin
    if (!group.isAdmin(adminId)) {
      throw new Error("Only admins can promote members");
    }

    group.addAdmin(userId);
    await group.save();

    await group.populate("admins", "username avatarUrl");

    return group;
  }

  /**
   * Remove admin
   */
  static async removeAdmin(groupId, adminId, userId) {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Only creator or the admin themselves can remove admin
    if (!adminId.equals(group.createdBy) && !adminId.equals(userId)) {
      throw new Error("Unauthorized");
    }

    group.removeAdmin(userId);
    await group.save();

    await group.populate("admins", "username avatarUrl");

    return group;
  }

  /**
   * Delete group
   */
  static async deleteGroup(groupId, userId) {
    const group = await Group.findById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    // Only creator can delete group
    if (!userId.equals(group.createdBy)) {
      throw new Error("Only group creator can delete the group");
    }

    // Delete associated chat
    await Chat.findOneAndDelete({ group: groupId });

    // Delete group
    await Group.findByIdAndDelete(groupId);

    return { message: "Group deleted successfully" };
  }
}

module.exports = GroupService;
