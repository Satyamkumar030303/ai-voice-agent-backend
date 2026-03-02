const Agent = require("../models/Agent");
const askGemini = require("../services/geminiService");

exports.createAgent = async (req, res) => {
  try {
    const { name, systemPrompt, greeting } = req.body;

    const agent = await Agent.create({
      user: req.user.userId,
      name,
      systemPrompt,
      greeting,
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
exports.getAgents = async (req, res) => {
  try {
    const agents = await Agent.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json({
      agents,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch agents ❌",
      error: error.message,
    });
  }
};

exports.getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

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

    // 
    const pdfParse = require("pdf-parse");
    const chunkText = require("../utils/chunkText");

exports.uploadPDF = async (req, res) => {
  try {
    const agentId = req.params.id;

    const agent = await Agent.findOne({
      _id: agentId,
      user: req.user.userId,
    });

    if (!agent) {
      return res.status(404).json({
        message: "Agent not found ❌",
      });
    }


    const data = await pdfParse(req.file.buffer);

    const text = data.text;

    const chunks = chunkText(text);

    agent.knowledgeBase.push(...chunks);    

    await agent.save();

    res.json({
      message: "PDF uploaded and processed ✅",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to process PDF ❌",
      error: error.message,
    });
  }
};

const searchChunks = require("../utils/searchChunks");

exports.askAgent = async (req, res) => {
  try {
    const { question } = req.body;

    const agent = await Agent.findById(req.params.id);

    const matchedChunks = searchChunks(
      agent.knowledgeBase,
      question
    );

    const context = matchedChunks.join("\n");

    // 🔥 prompt for AI
    const prompt = `
        You are an AI assistant.

        Use the following context to answer the question.

        Context:
        ${context}

        Question:
        ${question}
        `;

    const answer = await askGemini(prompt);

    res.json({
      answer,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};