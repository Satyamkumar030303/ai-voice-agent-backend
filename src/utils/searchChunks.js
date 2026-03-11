const { GoogleGenerativeAI } = require("@google/generative-ai");
const KnowledgeChunk = require("../models/KnowledgeChunk");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

async function searchChunks(query, knowledgeBaseId) {
  try {

    // 1️⃣ Generate embedding for user query
    // WARNING: Using the exact embedding model that created the chunks in the DB
    const model = genAI.getGenerativeModel({
      model: "gemini-embedding-001"
    });

    const result = await model.embedContent({
      content: {
        parts: [{ text: query }]
      }
    });

    const queryEmbedding = result.embedding.values;

    // 2️⃣ Vector search in MongoDB
    // NOTE: This will only work once the vector_index is created in MongoDB Atlas
    const chunks = await KnowledgeChunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 5,
          filter: {
            knowledgeBaseId: knowledgeBaseId
          }
        }
      },
      {
        $project: {
          text: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ]);

    return chunks;

  } catch (error) {
    console.error("Vector search error:", error);
    return [];
  }
}

module.exports = searchChunks;