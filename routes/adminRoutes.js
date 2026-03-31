const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const { authorize } = require("../middlewares/authorize");
const {
  getAdminDashboard,
  getUsersWithTaskCount,
  updateUserRole,
  deleteUser,
} = require("../controllers/adminController");

router.get("/dashboard", authenticate, authorize("admin"), getAdminDashboard);
router.get("/users", authenticate, authorize("admin"), getUsersWithTaskCount);
router.patch(
  "/users/:id/role",
  authenticate,
  authorize("admin"),
  updateUserRole,
);
router.delete("/users/:id", authenticate, authorize("admin"), deleteUser);

module.exports = router;
