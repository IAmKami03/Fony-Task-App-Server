const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid or inactive user." });
    }

    req.user = user; // attach user to request
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ message: "Authentication failed." });
  }
};
