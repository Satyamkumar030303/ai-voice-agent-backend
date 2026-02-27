const mongoose = require("mongoose");

const knowledgeBaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  fileName: String,
  // chunks: [String],
  // // chunks array hata diya kyunki ab KnowledgeChunk model handle karega
}, { timestamps: true });

module.exports = mongoose.model("KnowledgeBase", knowledgeBaseSchema);