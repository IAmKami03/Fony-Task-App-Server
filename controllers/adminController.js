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
