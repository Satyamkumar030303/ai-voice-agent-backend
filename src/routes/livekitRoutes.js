const express = require("express");
const router = express.Router();
const livekitController = require("../controllers/livekitController");

// Route to generate a LiveKit token so agents can join the room
router.post("/token", livekitController.generateToken);

module.exports = router;
