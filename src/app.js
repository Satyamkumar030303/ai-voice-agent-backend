const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const agentRoutes = require("./routes/agentRoutes");
const outboundRoutes = require("./routes/outboundRoutes");
const livekitRoutes = require("./routes/livekitRoutes");
const livekitController = require("./controllers/livekitController");

const app = express();

// Middlewares
app.use(cors());

// Twilio sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// For JSON APIs
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/outbound", outboundRoutes);
app.use("/api/livekit", livekitRoutes);

/**
 * TWILIO INBOUND VOICE WEBHOOK
 * Twilio will hit this endpoint when someone calls your Twilio number.
 * We forward the call to LiveKit SIP which creates a LiveKit room.
 */
app.post("/api/twilio/voice", livekitController.handleTwilioVoiceWebhook);

// Twilio status callback for outbound call lifecycle debugging
app.post("/api/twilio/status", livekitController.handleTwilioStatus);
app.post("/api/twilio/sip-status", livekitController.handleTwilioSipStatus);
app.post("/api/twilio/dial-action", livekitController.handleTwilioDialAction);

// Health check
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

module.exports = app;
