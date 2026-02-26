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
        askAgent,
    } = require("../controllers/agentController");

// Create Agent
router.post("/", protect, createAgent);

// Get Agents
router.get("/", protect, getAgents);

// Get single agent
router.get("/:id", protect, getAgentById);

// Delete agent
router.delete("/:id", protect, deleteAgent);

// Upload PDF
router.post("/:id/upload-pdf", protect, upload.single("file"), uploadPDF);

// Ask agent
router.post("/:id/ask", protect, askAgent);

module.exports = router;