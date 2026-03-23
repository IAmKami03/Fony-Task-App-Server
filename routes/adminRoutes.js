const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const {
  getAdminDashboard,
  getUsersWithTaskCount,
} = require("../controllers/adminController");

router.get("/dashboard", authenticate, authorize("admin"), getAdminDashboard);
router.get("/users", authenticate, authorize("admin"), getUsersWithTaskCount);

module.exports = router;
