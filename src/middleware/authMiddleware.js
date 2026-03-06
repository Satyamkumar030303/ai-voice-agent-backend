const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    console.log("Auth Header:", authHeader);

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized ❌" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("DECODED:", decoded);

    // Attach user to request
    req.user = {
      _id: decoded.userId,
    };

    next(); // 🔥 continue to route
  } catch (error) {
    console.log("JWT ERROR:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired, please login again",
      });
    }

    return res.status(401).json({
      message: "Invalid token",
    });
  }
};