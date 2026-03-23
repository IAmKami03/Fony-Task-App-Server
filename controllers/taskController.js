const Task = require("../models/Task");
const cloudinary = require("cloudinary").v2;

// Helper: Upload buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "task-manager" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    stream.end(buffer);
  });
};

// Helper: Extract Cloudinary public ID from URL
const extractPublicId = (url) => {
  return url
    ?.split("/")
    .slice(-2)
    .join("/")
    .replace(/\.[^/.]+$/, "");
};

// ------------------------- CREATE -------------------------
exports.create = async (req, res) => {
  try {
    const { title, description, priority, progress } = req.body;

    if (!title || !description || !priority) {
      return res.status(400).json({
        message: "Task title, description, and priority are required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Task image is required." });
    }

    const validPriorities = ["low", "medium", "high"];
    const normalizedPriority = priority.toLowerCase();
    if (!validPriorities.includes(normalizedPriority)) {
      return res.status(400).json({
        message: "Priority must be low, medium, or high.",
      });
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      priority: normalizedPriority,
      image: (await uploadToCloudinary(req.file.buffer)).secure_url,
      createdBy: req.user._id,
    };

    if (progress !== undefined) {
      const progressNum = Number(progress);
      if (progressNum < 0 || progressNum > 100 || Number.isNaN(progressNum)) {
        return res.status(400).json({
          message: "Progress must be a number between 0 and 100.",
        });
      }
      taskData.progress = progressNum;
      taskData.status = progressNum >= 100 ? "completed" : "ongoing";
    }

    const task = await Task.create(taskData);

    await task.populate("createdBy", "name email");
    return res.status(201).json(task);
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({ message: "Unable to create task." });
  }
};

// ------------------------- GET ALL TASKS -------------------------
exports.getAll = async (req, res) => {
  try {
    const tasks = await Task.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");
    return res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    return res.status(500).json({ message: "Unable to fetch tasks." });
  }
};

// ------------------------- GET ONGOING TASKS -------------------------
exports.getOngoing = async (req, res) => {
  try {
    const tasks = await Task.find({
      createdBy: req.user._id,
      status: "ongoing",
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");
    return res.json(tasks);
  } catch (error) {
    console.error("Get ongoing tasks error:", error);
    return res.status(500).json({ message: "Unable to fetch ongoing tasks." });
  }
};

// ------------------------- GET COMPLETED TASKS -------------------------
exports.getCompleted = async (req, res) => {
  try {
    const tasks = await Task.find({
      createdBy: req.user._id,
      status: "completed",
    })
      .sort({ updatedAt: -1 })
      .populate("createdBy", "name email");
    return res.json(tasks);
  } catch (error) {
    console.error("Get completed tasks error:", error);
    return res
      .status(500)
      .json({ message: "Unable to fetch completed tasks." });
  }
};

// ------------------------- GET TASK BY ID -------------------------
exports.getById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    }).populate("createdBy", "name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    return res.json(task);
  } catch (error) {
    console.error("Get task error:", error);
    return res.status(500).json({ message: "Unable to fetch task." });
  }
};

// ------------------------- UPDATE TASK -------------------------
exports.update = async (req, res) => {
  try {
    const { title, description, priority, progress } = req.body;

    // Find the task owned by the logged-in user
    const task = await Task.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    // Update title & description if provided
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();

    // Update priority if provided
    if (priority !== undefined) {
      const normalizedPriority = priority.toLowerCase();
      if (!["low", "medium", "high"].includes(normalizedPriority)) {
        return res.status(400).json({
          message: "Priority must be low, medium, or high.",
        });
      }
      task.priority = normalizedPriority;
    }
    // Update progress if provided
    if (progress !== undefined) {
      const progressNum = Number(progress);
      if (progressNum < 0 || progressNum > 100 || Number.isNaN(progressNum)) {
        return res.status(400).json({
          message: "Progress must be a number between 0 and 100.",
        });
      }
      task.progress = progressNum;
      // AUTO SYNC STATUS
      task.status = progressNum >= 100 ? "completed" : "ongoing";
    }

    // Replace image if a new one is uploaded
    if (req.file) {
      const publicId = extractPublicId(task.image);
      if (publicId) await cloudinary.uploader.destroy(publicId);
      const uploaded = await uploadToCloudinary(req.file.buffer);
      task.image = uploaded.secure_url;
    }

    await task.save();
    // Populate createdBy for frontend
    await task.populate("createdBy", "name email");

    return res.json(task);
  } catch (error) {
    console.error("Update task error:", error);
    return res.status(500).json({ message: "Unable to update task." });
  }
};

// ------------------------- DELETE TASK -------------------------
exports.remove = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }

    const publicId = extractPublicId(task.image);
    if (publicId) await cloudinary.uploader.destroy(publicId);

    await task.deleteOne();
    return res.status(204).send();
  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({ message: "Unable to delete task." });
  }
};
