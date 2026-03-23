const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      unique: true,
      required: function requiredPhoneNumber() {
        return !this.googleId;
      },
      sparse: true, // allows Google users to not have a phone number
      trim: true,
      index: true,
      validate: {
        validator: (v) => /^\+?[\d\s\-().]{7,20}$/.test(v),
        message: "Invalid phone number format.",
      },
    },
    googleId: { type: String, index: true },
    passwordHash: {
      type: String,
      select: false,
      required: function requiredPasswordHash() {
        return !this.googleId;
      },
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    resetOTP: { type: String, select: false },
    resetOTPExpires: { type: Date, select: false },
    isOTPVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

userSchema.methods.setPassword = async function setPassword(password) {
  const saltRounds = 12;
  this.passwordHash = await bcrypt.hash(password, saltRounds);
};

userSchema.methods.verifyPassword = async function verifyPassword(password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

// generate OTP
userSchema.methods.generateOTP = function () {
  const otp = crypto.randomInt(100000, 1000000).toString();

  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");

  this.resetOTP = hashedOTP;
  this.resetOTPExpires = Date.now() + 20 * 60 * 1000; // 20 mins

  return otp; // send THIS to user
};

// verify OTP
userSchema.methods.verifyOTP = function (otp) {
  if (!this.resetOTP || !this.resetOTPExpires) return false;

  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex");
  const isValid = this.resetOTP === hashedOTP;
  const isExpired = Date.now() > this.resetOTPExpires;

  return isValid && !isExpired;
};

module.exports = mongoose.model("User", userSchema);
