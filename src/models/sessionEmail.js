const mongoose = require("mongoose");

const sessionEmailSchema = new mongoose.Schema(
  {
    sessionKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      default: "voice-agent",
    },
    capturedAt: {
      type: Date,
      default: Date.now,
    },
    ProductId: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.SessionEmail || mongoose.model("SessionEmail", sessionEmailSchema);
