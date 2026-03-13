const express = require("express");
const router = express.Router();

const twilioController = require("../controllers/twilioController");
const { protect } = require("../middleware/authMiddleware");

// connect twilio account
router.post("/connect", protect, twilioController.connectTwilio);

// make outbound call
router.post("/call", protect, twilioController.makeCall);

module.exports = router;