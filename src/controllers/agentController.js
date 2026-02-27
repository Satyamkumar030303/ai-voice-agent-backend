const Agent = require("../models/Agent");
const KnowledgeBase = require("../models/KnowledgeBase");
const askGemini = require("../services/geminiService");

const pdfParse = require("pdf-parse");
const chunkText = require("../utils/chunkText");
const searchChunks = require("../utils/searchChunks");


// =======================
// 🟢 CREATE AGENT
// =======================
exports.createAgent = async (req, res) => {
  try {
    const { name, systemPrompt, greeting } = req.body;

    const agent = await Agent.create({
      user: req.user.userId,
      name,
      systemPrompt,
      greeting,
      knowledgeBases: [],
    });

    res.status(201).json({
      message: "Agent created successfully ✅",
      agent,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to create agent ❌",
      error: error.message,
    });
  }
};


// =======================
// 🟢 GET ALL AGENTS
// =======================
exports.getAgents = async (req, res) => {
  try {
    const agents = await Agent.find({
      user: req.user.userId,
    })
      .populate("knowledgeBases")
      .sort({ createdAt: -1 });

    res.json({ agents });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch agents ❌",
      error: error.message,
    });
  }
};


// =======================
// 🟢 GET SINGLE AGENT
// =======================
exports.getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.id,
      user: req.user.userId,
    }).populate("knowledgeBases");

    if (!agent) {
      return res.status(404).json({
        message: "Agent not found ❌",
      });
    }

    res.json({ agent });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch agent ❌",
      error: error.message,
    });
  }
};


// =======================
// 🟢 DELETE AGENT
// =======================
exports.deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!agent) {
      return res.status(404).json({
        message: "Agent not found ❌",
      });
    }

    res.json({
      message: "Agent deleted successfully 🗑️",
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete agent ❌",
      error: error.message,
    });
  }
};


// =======================
// 🟢 UPLOAD PDF (INDEPENDENT)
// =======================
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded ❌",
      });
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text;

    const chunks = chunkText(text);

    const kb = await KnowledgeBase.create({
      user: req.user.userId,
      fileName: req.file.originalname,
      chunks,
    });

    res.json({
      message: "PDF uploaded successfully ✅",
      knowledgeBase: kb,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to process PDF ❌",
      error: error.message,
    });
  }
};


// =======================
// 🟢 ATTACH KB TO AGENT
// =======================
exports.attachKBToAgent = async (req, res) => {
  try {
    const { agentId, kbId } = req.body;

    const agent = await Agent.findOne({
      _id: agentId,
      user: req.user.userId,
    });

    if (!agent) {
      return res.status(404).json({
        message: "Agent not found ❌",
      });
    }

    // prevent duplicate attach
    if (agent.knowledgeBase.includes(kbId)) {
      return res.json({
        message: "Already attached ⚠️",
      });
    }

    agent.knowledgeBase.push(kbId);
    await agent.save();

    res.json({
      message: "Knowledge base attached successfully ✅",
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to attach KB ❌",
      error: error.message,
    });
  }
};


// =======================
// 🟢 GET USER KBs
// =======================
exports.getKnowledgeBase = async (req, res) => {
  try {
    const kbs = await KnowledgeBase.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json({ kbs });

  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch KB ❌",
      error: error.message,
    });
  }
};


// =======================
// 🟢 ASK AGENT (RAG)
// =======================
exports.askAgent = async (req, res) => {
  try {
    const { question } = req.body;

    const agent = await Agent.findById(req.params.id)
      .populate("knowledgeBase");

    if (!agent) {
      return res.status(404).json({
        message: "Agent not found ❌",
      });
    }

    // 🔥 collect all chunks
    let allChunks = [];

    agent.knowledgeBase.forEach((kb) => {
      allChunks.push(...kb.chunks);
    });

    const matchedChunks = searchChunks(allChunks, question);
    const context = matchedChunks.join("\n");

    const prompt = `
You are an AI assistant.

Use the following context to answer the question.

Context:
${context}

Question:
${question}
`;

    const answer = await askGemini(prompt);

    res.json({ answer });

  } catch (error) {
    res.status(500).json({
      message: "Failed to get answer ❌",
      error: error.message,
    });
  }
};