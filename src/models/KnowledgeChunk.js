const mongoose = require("mongoose");

const knowledgeChunkSchema = new mongoose.Schema({
  knowledgeBaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "KnowledgeBase",
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  embedding: {
    type: [Number], // Ye vector array store karega
    required: true,
  }
});

module.exports = mongoose.model("KnowledgeChunk", knowledgeChunkSchema);