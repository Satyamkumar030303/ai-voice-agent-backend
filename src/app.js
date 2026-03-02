const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const agentRoutes = require("./routes/agentRoutes");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/agents", agentRoutes);

// 🔥 Twilio webhook
app.all("/api/twilio/voice", (req, res) => {
  console.log("📞 Incoming call from Twilio");

  res.set("Content-Type", "text/xml");

  res.send(`
    <Response>
      <Say>Hello Satyam, your AI voice agent is live!
      Hardik Big BRO is MAD 😎</Say>
    </Response>
  `);
});

// Health check
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

module.exports = app;