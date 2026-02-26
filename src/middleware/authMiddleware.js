const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(authHeader);

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized ❌" });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach userId to request
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token ❌" });
  }
};