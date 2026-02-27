const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  createAgent,
  getAgents,
  getAgentById,
  deleteAgent,
  uploadPDF,
  attachKBToAgent,
  getKnowledgeBase,
  askAgent,
} = require("../controllers/agentController");


// =======================
// 🟢 AGENT ROUTES
// =======================

// Create Agent
router.post("/", protect, createAgent);

// Get all agents
router.get("/", protect, getAgents);

// Get single agent
router.get("/:id", protect, getAgentById);

// Delete agent
router.delete("/:id", protect, deleteAgent);


// =======================
// 🟢 KNOWLEDGE BASE ROUTES
// =======================

// Upload PDF (independent of agent)
router.post(
  "/upload",
  protect,
  upload.single("file"), // ⚠️ MUST be "file"
  uploadPDF
);

// Get all user PDFs
router.get("/kb", protect, getKnowledgeBase);

// Attach KB to agent
router.post("/attach-kb", protect, attachKBToAgent);


// =======================
// 🟢 AI ROUTE
// =======================

// Ask agent
router.post("/:id/ask", protect, askAgent);


module.exports = router;