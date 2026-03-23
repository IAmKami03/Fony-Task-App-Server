const jwt = require("jsonwebtoken");
const User = require("../models/User");
const passport = require("../config/passport");
const { sendEmail } = require("../utils/sendEmail");

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
}

exports.register = async (req, res) => {
  try {
    let { name, email, phoneNumber, password, confirmPassword } = req.body;

    if (!name || !email || !phoneNumber || !password || !confirmPassword) {
      return res
        .status(400)
        .json({ message: "All required fields must be provided." });
    }

    email = email.trim().toLowerCase();
    phoneNumber = phoneNumber.trim();

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phoneNumber }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "A user with this email or phone number already exists.",
      });
    }

    const user = new User({
      name,
      email,
      phoneNumber,
    });

    await user.setPassword(password);
    await user.save();

    const token = createToken(user);

    return res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res
      .status(500)
      .json({ message: "Unable to register user right now." });
  }
};

exports.login = async (req, res) => {
  try {
    let { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
      return res
        .status(400)
        .json({ message: "Email/phone and password are required." });
    }

    emailOrPhone = emailOrPhone.trim();

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phoneNumber: emailOrPhone }],
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const isValid = await user.verifyPassword(password);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = createToken(user);

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Unable to log in right now." });
  }
};

exports.googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  session: false,
});

exports.googleCallback = [
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  (req, res) => {
    const token = createToken(req.user);
    // redirect to frontend with token in query param
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  },
];

exports.sendPasswordOTP = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "+resetOTP +resetOTPExpires",
    );

    const otp = user.generateOTP();
    await user.save();

    await sendEmail(
      user.email,
      "Your OTP Code",
      `<h2>Your OTP is: ${otp}</h2><p>Expires in 20 minutes</p>`,
    );

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

exports.verifyPasswordOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    const user = await User.findById(req.user._id).select(
      "+resetOTP +resetOTPExpires",
    );

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    user.isOTPVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Verification failed" });
  }
};

exports.resetPasswordWithOTP = async (req, res) => {
  try {
    const { newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+passwordHash");

    if (!user.isOTPVerified) {
      return res.status(403).json({
        message: "OTP verification required",
      });
    }

    await user.setPassword(newPassword);

    // cleanup
    user.isOTPVerified = false;
    user.resetOTP = undefined;
    user.resetOTPExpires = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Reset failed" });
  }
};
