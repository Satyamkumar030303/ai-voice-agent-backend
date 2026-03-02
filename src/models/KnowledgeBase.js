const mongoose = require("mongoose");

const knowledgeBaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  fileName: String,
  // chunks: [String],
  chunks: [{ type: mongoose.Schema.Types.ObjectId, ref: "KnowledgeChunk" }],
}, { timestamps: true });

module.exports = mongoose.model("KnowledgeBase", knowledgeBaseSchema);