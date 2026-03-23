const express = require("express");
const {
  create,
  getAll,
  getOngoing,
  getCompleted,
  getById,
  update,
  remove,
} = require("../controllers/taskController");
const { authenticate } = require("../middlewares/auth");
const { uploadSingle } = require("../middlewares/upload"); // <-- add your Cloudinary upload middleware

const router = express.Router();

// Protect all routes
router.use(authenticate);

// Create a task with image upload
router.post("/", uploadSingle, create);

// Get tasks
router.get("/", getAll);
router.get("/ongoing", getOngoing);
router.get("/completed", getCompleted);
router.get("/:id", getById);

// Update task with optional image replacement
router.patch("/:id", uploadSingle, update);

// Delete task
router.delete("/:id", remove);

module.exports = router;
