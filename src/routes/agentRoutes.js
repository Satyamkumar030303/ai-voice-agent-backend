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
  deleteKB, // deleteKB for knowledge base
  removeKBFromAgent,//remove kb from agent
} = require("../controllers/agentController");

// =======================
// 🟢 KNOWLEDGE BASE ROUTES
// =======================

router.post("/upload", protect, upload.single("file"), uploadPDF);
router.get("/kb", protect, getKnowledgeBase); // ✅ FIRST
router.post("/attach-kb", protect, attachKBToAgent);
// Add deleteKB to your destructuring at the top


// Update the route line:
router.delete("/kb/:id", protect, deleteKB);

// =======================
// 🟢 AGENT ROUTES
// =======================

router.post("/", protect, createAgent);
router.get("/", protect, getAgents);
router.get("/:id", protect, getAgentById); // ✅ AFTER /kb
router.delete("/:id", protect, deleteAgent);
router.put("/:id", protect, updateAgent);
router.post("/remove-kb", protect, removeKBFromAgent);
// =======================
// 🟢 AI ROUTE
// =======================

router.post("/:id/ask", protect, askAgent);
module.exports = router;