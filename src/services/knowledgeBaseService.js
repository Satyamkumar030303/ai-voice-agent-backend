const mongoose = require("mongoose");
const Agent = require("../models/Agent");
require("../models/KnowledgeBase");
const KnowledgeChunk = require("../models/KnowledgeChunk");
const { embedGemini } = require("./geminiService");

let mongoConnectPromise = null;

async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required for knowledge base retrieval.");
  }

  if (!mongoConnectPromise) {
    mongoConnectPromise = mongoose.connect(process.env.MONGO_URI);
  }

  try {
    await mongoConnectPromise;
    return mongoose.connection;
  } catch (error) {
    mongoConnectPromise = null;
    throw error;
  }
}

async function getAgentKnowledgeInfo(agentId) {
  await ensureMongoConnection();

  const agent = await Agent.findById(agentId)
    .select("name knowledgeBase")
    .populate("knowledgeBase", "fileName");

  if (!agent) {
    throw new Error("Agent not found.");
  }

  return {
    agent,
    knowledgeBaseIds: agent.knowledgeBase.map((kb) => kb._id),
    knowledgeBaseFiles: agent.knowledgeBase.map((kb) => kb.fileName),
  };
}

async function retrieveKnowledgeContext(agentId, question, options = {}) {
  const { limit = 5, numCandidates = 100 } = options;

  const trimmedQuestion = (question || "").trim();
  if (!trimmedQuestion) {
    return {
      agent: null,
      knowledgeBaseFiles: [],
      matches: [],
      context: "",
    };
  }

  const { agent, knowledgeBaseIds, knowledgeBaseFiles } = await getAgentKnowledgeInfo(agentId);

  if (!knowledgeBaseIds.length) {
    return {
      agent,
      knowledgeBaseFiles,
      matches: [],
      context: "",
    };
  }

  const questionEmbedding = await embedGemini(trimmedQuestion);

  const matches = await KnowledgeChunk.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: questionEmbedding,
        numCandidates,
        limit,
        filter: {
          knowledgeBaseId: { $in: knowledgeBaseIds },
        },
      },
    },
    {
      $project: {
        _id: 1,
        knowledgeBaseId: 1,
        text: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);

  return {
    agent,
    knowledgeBaseFiles,
    matches,
    context: matches.map((match) => match.text).join("\n\n"),
  };
}

module.exports = {
  ensureMongoConnection,
  getAgentKnowledgeInfo,
  retrieveKnowledgeContext,
};
