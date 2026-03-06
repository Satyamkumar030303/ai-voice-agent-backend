const express = require("express");
const router = express.Router();
const User = require("../models/User");

const { protect } = require("../middleware/authMiddleware");
const { registerUser, loginUser } = require("../controllers/userController");
const { connectTwilio, makeCall } = require("../controllers/twilioController");

router.post("/register", registerUser);
router.post("/login", loginUser);

// ✅ FIXED
router.post("/call", protect, makeCall);

router.post("/connect-twilio", protect, connectTwilio);

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "name email twilio.phoneNumber twilio.accountSid twilio.isConnected"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found ❌" });
    }

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch profile ❌",
      error: error.message,
    });
  }
});

module.exports = router;
