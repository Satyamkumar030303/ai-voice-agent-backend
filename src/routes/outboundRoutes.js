const express = require("express");
const router = express.Router();
const livekitController = require("../controllers/livekitController");

// Route to initiate an outbound call using LiveKit SIP
router.post("/call", livekitController.createOutboundCall);

module.exports = router;
