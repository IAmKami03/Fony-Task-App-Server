const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const passport = require("./config/passport");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Fony server is running" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set in environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
