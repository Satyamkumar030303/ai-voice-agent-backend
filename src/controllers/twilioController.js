const twilio = require("twilio");
const User = require("../models/User");

exports.connectTwilio = async (req, res) => {
  try {
    const { accountSid, authToken, phoneNumber } = req.body;

    // create twilio client
    const client = twilio(accountSid, authToken);

    // 🔥 VERIFY credentials (important)
    await client.api.accounts(accountSid).fetch();
    console.log("Twilio credentials verified ✅");

    // save in DB
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        twilio: {
          accountSid,
          authToken,
          phoneNumber,
          isConnected: true,
        },
      },
      { new: true }
    );

    res.json({
      message: "Twilio connected successfully ✅",
      twilio: user.twilio,
    });
  } catch (error) {
  console.log("FULL ERROR:", error);
  console.log("STATUS:", error.status);
  console.log("CODE:", error.code);

  res.status(400).json({
    message: "Invalid Twilio credentials ❌",
    error: error.message,
  });
}
};

exports.makeCall = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // ✅ Check Twilio connected
    if (!user.twilio || !user.twilio.isConnected) {
      return res.status(400).json({
        message: "Twilio not connected ❌",
      });
    }

    const { accountSid, authToken, phoneNumber } = user.twilio;

    // ✅ Get number from request
    const { to } = req.body;

    if (!to) {
      return res.status(400).json({
        message: "Phone number (to) is required ❌",
      });
    }

    // ✅ Create Twilio client
    const client = twilio(accountSid, authToken);

    // ✅ Make call
    const call = await client.calls.create({
      to: to,                  // 🔥 dynamic number
      from: phoneNumber,       // Twilio number
      url: "https://flo-gaslighted-unartistically.ngrok-free.dev/api/twilio/voice"
    });

    res.json({
      message: "Call initiated ✅",
      sid: call.sid,
    });

  } catch (error) {
    console.log("CALL ERROR:", error);

    res.status(500).json({
      message: "Call failed ❌",
      error: error.message,
    });
  }
};