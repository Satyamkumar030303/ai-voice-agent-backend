const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    systemPrompt: {
      type: String,
      required: true,
    },

    greeting: {
      type: String,
      default: "Hello, how can I help you today?",
    },

    // future use (PDF knowledge base)
    knowledgeBase: [
      {
        type: String, // we will store chunks later
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Agent", agentSchema);