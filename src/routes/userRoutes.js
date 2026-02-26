const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const { registerUser, loginUser } = require("../controllers/userController");
const { connectTwilio, makeCall } = require("../controllers/twilioController");

router.post("/register", registerUser);
router.post("/login", loginUser);

// ✅ FIXED
router.post("/call", protect, makeCall);

router.post("/connect-twilio", protect, connectTwilio);

router.get("/me", protect, (req, res) => {
  res.json({
    message: "Protected route working ✅",
    user: req.user,
  });
});

module.exports = router;
