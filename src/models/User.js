const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    // 🔑 forgot password fields
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // Twilio Credentials
    twilio: {
      accountSid: String,
      authToken: String,
      phoneNumber: String,
      isConnected: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);