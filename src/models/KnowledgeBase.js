const mongoose = require("mongoose");

const knowledgeBaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  fileName: String,
  chunks: [String],
}, { timestamps: true });

module.exports = mongoose.model("KnowledgeBase", knowledgeBaseSchema);