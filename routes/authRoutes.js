const express = require("express");
const {
  register,
  login,
  googleAuth,
  googleCallback,
  resetPasswordWithOTP,
  verifyPasswordOTP,
  sendPasswordOTP,
  getMe,
  updateProfile,
} = require("../controllers/authController");

const { authenticate } = require("../middlewares/auth");
const { uploadSingle } = require("../middlewares/upload");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/google", googleAuth);
router.get("/google/callback", googleCallback);
router.get("/me", authenticate, getMe);
router.patch("/profile", authenticate, uploadSingle, updateProfile);

router.post("/send-otp", authenticate, sendPasswordOTP);
router.post("/verify-otp", authenticate, verifyPasswordOTP);
router.post("/reset-password", authenticate, resetPasswordWithOTP);

module.exports = router;
