const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
  createAgent,
  getAgents,
  getAgentById,
  deleteAgent,
  updateAgent,
  uploadPDF,
  attachKBToAgent,
  getKnowledgeBase,
  askAgent,
} = require("../controllers/agentController");

// =======================
// 🟢 KNOWLEDGE BASE ROUTES
// =======================

router.post("/upload", protect, upload.single("file"), uploadPDF);
router.get("/kb", protect, getKnowledgeBase); // ✅ FIRST
router.post("/attach-kb", protect, attachKBToAgent);

// =======================
// 🟢 AGENT ROUTES
// =======================

router.post("/", protect, createAgent);
router.get("/", protect, getAgents);
router.get("/:id", protect, getAgentById); // ✅ AFTER /kb
router.delete("/:id", protect, deleteAgent);
router.put("/:id", protect, updateAgent);

// =======================
// 🟢 AI ROUTE
// =======================

router.post("/:id/ask", protect, askAgent);
module.exports = router;