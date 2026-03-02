const Agent = require("../models/Agent");
const KnowledgeBase = require("../models/KnowledgeBase");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const {askGemini , embedGemini} = require("../services/geminiService");

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
      knowledgeBase: [], // Yahan singular kar diya
    });

    res.status(201).json({
      message: "Agent created successfully ✅",
      agent,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create agent ❌", error: error.message });
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
      user: req.user.userId,
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
//=====================================================
// update agent details (name, systemPrompt, greeting)

exports.updateAgent = async (req, res) => {
  try {
    const { name, systemPrompt, greeting } = req.body;

    const agent = await Agent.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },
      {
        name,
        systemPrompt,
        greeting,
      },
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

//=====================================================

// =======================
// 🟢 UPLOAD PDF (Embeddings ke sath)
// =======================
exports.uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded ❌" });
    }

    const data = await pdfParse(req.file.buffer);
    const chunks = chunkText(data.text);

    // 1. Pehle KnowledgeBase (Parent folder) banao
    const kb = await KnowledgeBase.create({
      user: req.user.userId,
      fileName: req.file.originalname,
    });

    // 2. Har chunk ka embedding generate karo aur array mein daalo
    const chunkDocs = [];
    for (const text of chunks) {
      const embedding = await embedGemini(text);
      chunkDocs.push({
        knowledgeBaseId: kb._id,
        text: text,
        embedding: embedding
      });
    }

    // 3. Ek sath saare chunks aur unke vectors save kar do (Fast performance)
    await KnowledgeChunk.insertMany(chunkDocs);

    res.json({
      message: "PDF uploaded and embeddings stored successfully ✅",
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
      return res.status(404).json({ message: "Agent not found ❌" });
    }

    // Yahan singular name use kiya
    if (agent.knowledgeBase.includes(kbId)) {
      return res.json({ message: "Already attached ⚠️" });
    }

    agent.knowledgeBase.push(kbId);
    await agent.save();

    res.json({ message: "Knowledge base attached successfully ✅" });
  } catch (error) {
    res.status(500).json({ message: "Failed to attach KB ❌", error: error.message });
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

    // Agent ko fetch karo (populate ki zaroorat nahi vector search ke liye)
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({ message: "Agent not found ❌" });
    }

    // Check karo ki agent ke paas kam se kam ek KnowledgeBase attached ho
    if (!agent.knowledgeBase || agent.knowledgeBase.length === 0) {
      return res.status(400).json({ 
        message: "Please attach a Knowledge Base to this agent first ⚠️" 
      });
    }

    // 1. Question ka vector banao
    const questionEmbedding = await embedGemini(question);

    // 2. Vector search karo
    const matchedChunks = await KnowledgeChunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index", 
          path: "embedding",
          queryVector: questionEmbedding,
          numCandidates: 100,
          limit: 5,
          filter: {
            // Yahan agent.knowledgeBase array pass kar rahe hain
            knowledgeBaseId: { $in: agent.knowledgeBase } 
          }
        }
      }
    ]);

    // 3. Context combine karo
    const context = matchedChunks.map(chunk => chunk.text).join("\n\n");

    // 4. Gemini se pucho
    const prompt = `
You are an AI assistant. Use the following context to answer the question. 
If the answer is not present in the context, say you don't know.

Context:
${context}

Question:
${question}
`;

    const answer = await askGemini(prompt);

    res.json({ answer });

  } catch (error) {
    res.status(500).json({ message: "Failed to get answer ❌", error: error.message });
  }
};