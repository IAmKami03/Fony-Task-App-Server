const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    priority: {
      type: String,
      required: true,
      enum: ["low", "medium", "high"],
      default: "low",
      lowercase: true,
    },
    image: { type: String, trim: true },
    status: {
      type: String,
      enum: ["ongoing", "completed"],
      default: "ongoing",
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Task", taskSchema);
