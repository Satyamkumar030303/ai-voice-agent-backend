const Agent = require("../models/Agent");
const KnowledgeBase = require("../models/KnowledgeBase");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const { askGemini, embedGemini } = require("../services/geminiService");

const pdfParse = require("pdf-parse");
const chunkText = require("../utils/chunkText");

// =======================
// 🟢 CREATE AGENT
// =======================
exports.createAgent = async (req, res) => {
  try {
    const { name, systemPrompt, greeting } = req.body;

    const agent = await Agent.create({
      user: req.user._id, // ✅ FIXED
      name,
      systemPrompt,
      greeting,
      knowledgeBase: [],
    });

    res.status(201).json({
      message: "Agent created successfully ✅",
      agent,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to create agent ❌",
      error: error.message
    });
  }
};


// =======================
// 🟢 GET ALL AGENTS
// =======================
exports.getAgents = async (req, res) => {
  try {
    const agents = await Agent.find({
      user: req.user._id, // ✅ FIXED
    })
      .populate("knowledgeBase")
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
      user: req.user._id, // ✅ FIXED
    }).populate("knowledgeBase");

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
      user: req.user._id, // ✅ FIXED
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
// 🟢 UPDATE AGENT
// =======================
exports.updateAgent = async (req, res) => {
  try {
    const { name, systemPrompt, greeting } = req.body;

    const agent = await Agent.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id, // ✅ FIXED
      },
      { name, systemPrompt, greeting },
      { new: true }
    );

    if (!agent) {
      return res.status(404).json({
        message: "Agent not found ❌",
      });
    }

    res.json({
      message: "Agent updated successfully ✅",
      agent,
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to update agent ❌",
      error: error.message,
    });
  }
};


// =======================
// 🟢 UPLOAD PDF
// =======================
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded ❌" });
    }

    const data = await pdfParse(req.file.buffer);
    const chunks = chunkText(data.text);

    const kb = await KnowledgeBase.create({
      user: req.user._id, // ✅ FIXED
      fileName: req.file.originalname,
    });
    console.log("CREATED KB:", kb);

    const chunkDocs = [];

    for (const text of chunks) {
      const embedding = await embedGemini(text);

      chunkDocs.push({
        knowledgeBaseId: kb._id,
        text,
        embedding,
      });
    }

    await KnowledgeChunk.insertMany(chunkDocs);

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
      user: req.user._id, // ✅ FIXED
    });

    if (!agent) {
      return res.status(404).json({ message: "Agent not found ❌" });
    }

    if (agent.knowledgeBase.includes(kbId)) {
      return res.json({ message: "Already attached ⚠️" });
    }

    agent.knowledgeBase.push(kbId);
    await agent.save();

    res.json({ message: "Knowledge base attached ✅" });

  } catch (error) {
    res.status(500).json({
      message: "Failed to attach KB ❌",
      error: error.message
    });
  }
};


// =======================
// 🟢 GET KBs
// =======================
// const mongoose = require("mongoose");

const mongoose = require("mongoose");

exports.getKnowledgeBase = async (req, res) => {
  try {
    console.log("REQ.USER:", req.user);

    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized ❌" });
    }

    // ✅ NO conversion
    const kbs = await KnowledgeBase.find({
      user: req.user._id,
    }).lean(); // 👈 IMPORTANT

    console.log("KBS FOUND:", kbs);

    res.json({ kbs });

  } catch (error) {
    console.error("🔥 REAL ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch KB ❌",
      error: error.message,
    });
  }
};

// =======================
// 🟢 ASK AGENT
// =======================
exports.askAgent = async (req, res) => {
  try {
    const { question } = req.body;

    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({ message: "Agent not found ❌" });
    }

    if (!agent.knowledgeBase.length) {
      return res.status(400).json({
        message: "Attach KB first ⚠️"
      });
    }

    const questionEmbedding = await embedGemini(question);

    const matchedChunks = await KnowledgeChunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: questionEmbedding,
          numCandidates: 100,
          limit: 5,
          filter: {
            knowledgeBaseId: { $in: agent.knowledgeBase }
          }
        }
      }
    ]);

    const context = matchedChunks.map(c => c.text).join("\n\n");

    const prompt = `
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
      error: error.message
    });
  }
};