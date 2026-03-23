const express = require("express");
const {
  register,
  login,
  googleAuth,
  googleCallback,
  resetPasswordWithOTP,
  verifyPasswordOTP,
  sendPasswordOTP,
} = require("../controllers/authController");

const { authenticate } = require("../middlewares/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);

router.post("/send-otp", authenticate, sendPasswordOTP);
router.post("/verify-otp", authenticate, verifyPasswordOTP);
router.post("/reset-password", authenticate, resetPasswordWithOTP);

module.exports = router;
