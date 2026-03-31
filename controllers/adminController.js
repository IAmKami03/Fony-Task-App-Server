const User = require("../models/User");
const Task = require("../models/Task");

exports.getAdminDashboard = async (req, res) => {
  try {
    const [totalUsers, totalTasks] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Task.countDocuments(),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalTasks,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard",
    });
  }
};

// Get users only with their task counts
exports.getUsersWithTaskCount = async (req, res) => {
  try {
    const { page = 1, limit = 50, role } = req.query;

    const matchFilter = { isActive: true };
    if (role) matchFilter.role = role;

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.aggregate([
        { $match: matchFilter },

        {
          $lookup: {
            from: "tasks",
            localField: "_id",
            foreignField: "createdBy",
            as: "tasks",
          },
        },

        {
          $addFields: {
            taskCount: { $size: "$tasks" },
            completedTasks: {
              $size: {
                $filter: {
                  input: "$tasks",
                  as: "task",
                  cond: { $eq: ["$$task.status", "completed"] },
                },
              },
            },
            ongoingTasks: {
              $size: {
                $filter: {
                  input: "$tasks",
                  as: "task",
                  cond: { $eq: ["$$task.status", "ongoing"] },
                },
              },
            },
          },
        },

        { $sort: { taskCount: -1, name: 1 } },
        { $skip: skip },
        { $limit: Number(limit) },

        {
          $project: {
            name: 1,
            email: 1,
            avatar: 1,
            role: 1,
            createdAt: 1,
            lastLoginAt: 1,
            taskCount: 1,
            completedTasks: 1,
            ongoingTasks: 1,
          },
        },
      ]),
      User.countDocuments(matchFilter),
    ]);

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// Promote or demote a user's role
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Role must be 'user' or 'admin'." });
    }

    // Prevent admin from demoting themselves
    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot change your own role." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `User has been ${role === "admin" ? "promoted to admin" : "demoted to user"}.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ message: "Failed to update user role." });
  }
};

// Delete a user and all their tasks and Cloudinary assets
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Delete all their task images from Cloudinary
    const tasks = await Task.find({ createdBy: id });
    const deleteImagePromises = tasks
      .filter((t) => t.image)
      .map((t) => {
        const publicId = t.image
          .split("/")
          .slice(-2)
          .join("/")
          .replace(/\.[^/.]+$/, "");
        return cloudinary.uploader.destroy(publicId).catch(() => {});
      });
    await Promise.all(deleteImagePromises);

    // Delete all their tasks
    await Task.deleteMany({ createdBy: id });

    // Delete their avatar from Cloudinary if exists
    if (user.avatar) {
      const publicId = user.avatar
        .split("/")
        .slice(-2)
        .join("/")
        .replace(/\.[^/.]+$/, "");
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    // Delete the user
    await user.deleteOne();

    res.json({
      success: true,
      message: "User and all their data have been deleted.",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user." });
  }
};
