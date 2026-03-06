const twilio = require("twilio");
const { AccessToken } = require("livekit-server-sdk");
const User = require("../models/User");
const Agent = require("../models/Agent");

const normalizeEnv = (value) => (value || "").trim();

const normalizePhone = (value) => {
  const trimmed = (value || "").trim();
  return trimmed.replace(/[^\d+]/g, "");
};

const getVoiceWebhookUrl = (req) => {
  const explicitWebhook = normalizeEnv(process.env.TWILIO_VOICE_WEBHOOK_URL);
  if (explicitWebhook) {
    return explicitWebhook;
  }

  const baseUrl = normalizeEnv(process.env.PUBLIC_BASE_URL);
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/api/twilio/voice`;
  }

  return `${req.protocol}://${req.get("host")}/api/twilio/voice`;
};

const appendRoomName = (webhookUrl, roomName) => {
  try {
    const url = new URL(webhookUrl);
    url.searchParams.set("roomName", roomName);
    return url.toString();
  } catch (_error) {
    // Fallback for invalid absolute URL cases
    const separator = webhookUrl.includes("?") ? "&" : "?";
    return `${webhookUrl}${separator}roomName=${encodeURIComponent(roomName)}`;
  }
};

const getStatusCallbackUrl = (req) => {
  const explicitWebhook = normalizeEnv(process.env.TWILIO_STATUS_CALLBACK_URL);
  if (explicitWebhook) {
    return explicitWebhook;
  }

  const baseUrl = normalizeEnv(process.env.PUBLIC_BASE_URL);
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/api/twilio/status`;
  }

  return `${req.protocol}://${req.get("host")}/api/twilio/status`;
};

const getDialActionUrl = (req) => {
  const explicitWebhook = normalizeEnv(process.env.TWILIO_DIAL_ACTION_URL);
  if (explicitWebhook) {
    return explicitWebhook;
  }

  const baseUrl = normalizeEnv(process.env.PUBLIC_BASE_URL);
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/api/twilio/dial-action`;
  }

  return `${req.protocol}://${req.get("host")}/api/twilio/dial-action`;
};

const getSipStatusCallbackUrl = (req) => {
  const explicitWebhook = normalizeEnv(process.env.TWILIO_SIP_STATUS_CALLBACK_URL);
  if (explicitWebhook) {
    return explicitWebhook;
  }

  const baseUrl = normalizeEnv(process.env.PUBLIC_BASE_URL);
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/api/twilio/sip-status`;
  }

  return `${req.protocol}://${req.get("host")}/api/twilio/sip-status`;
};

const getLivekitSipUriBase = () => normalizeEnv(process.env.LIVEKIT_SIP_URI);
const getLivekitApiKey = () => normalizeEnv(process.env.LIVEKIT_API_KEY);
const getLivekitApiSecret = () => normalizeEnv(process.env.LIVEKIT_API_SECRET);

const buildLivekitSipUri = (roomName) => {
  const base = getLivekitSipUriBase();
  if (!base) {
    return null;
  }
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}roomName=${encodeURIComponent(roomName)}`;
};

const buildAgentIdentity = (agentId) => `agent-${agentId}`;

const generateAgentToken = async ({ roomName, agent }) => {
  const apiKey = getLivekitApiKey();
  const apiSecret = getLivekitApiSecret();

  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required for agent token generation.");
  }

  const identity = buildAgentIdentity(String(agent._id));
  const metadata = JSON.stringify({
    role: "agent",
    agentId: String(agent._id),
    agentName: agent.name,
  });

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: agent.name,
    metadata,
  });
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

  const token = await at.toJwt();
  return { token, identity, metadata };
};

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
    const { to, agentId } = req.body;
    const normalizedTo = normalizePhone(to);

    if (!normalizedTo) {
      return res.status(400).json({
        message: "Phone number (to) is required ❌",
      });
    }
    if (!agentId) {
      return res.status(400).json({
        message: "agentId is required to start a call.",
      });
    }

    const agent = await Agent.findOne({ _id: agentId, user: req.user._id }).select("_id name");
    if (!agent) {
      return res.status(404).json({
        message: "Agent not found for this user.",
      });
    }

    // ✅ Create Twilio client
    const client = twilio(accountSid, authToken);

    const roomName = `call-${Date.now()}`;
    const webhookUrl = getVoiceWebhookUrl(req);
    const webhookUrlWithRoom = appendRoomName(webhookUrl, roomName);
    const statusCallbackUrl = getStatusCallbackUrl(req);
    const dialActionUrl = getDialActionUrl(req);
    const sipStatusCallbackUrl = getSipStatusCallbackUrl(req);
    const livekitSipUri = buildLivekitSipUri(roomName);

    if (!livekitSipUri) {
      return res.status(500).json({
        message: "LIVEKIT_SIP_URI missing in backend env ❌",
      });
    }

    const { token: agentToken, identity: agentIdentity, metadata: agentMetadata } =
      await generateAgentToken({ roomName, agent });

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial answerOnBridge="true" action="${dialActionUrl}" method="POST">
    <Sip statusCallback="${sipStatusCallbackUrl}" statusCallbackMethod="POST" statusCallbackEvent="initiated ringing answered completed">${livekitSipUri}</Sip>
  </Dial>
</Response>`;

    // ✅ Make call
    const call = await client.calls.create({
      to: normalizedTo,        // 🔥 dynamic number
      from: phoneNumber,       // Twilio number
      twiml,
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: "POST",
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    res.json({
      message: "Call initiated ✅",
      sid: call.sid,
      webhookUrl: webhookUrlWithRoom,
      statusCallbackUrl,
      dialActionUrl,
      sipStatusCallbackUrl,
      sipUri: livekitSipUri,
      roomName,
      agent: {
        id: agent._id,
        name: agent.name,
        identity: agentIdentity,
        token: agentToken,
        metadata: agentMetadata,
      },
    });

  } catch (error) {
    console.log("CALL ERROR:", error);

    res.status(500).json({
      message: "Call failed ❌",
      error: error.message,
    });
  }
};
