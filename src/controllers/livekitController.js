const { SipClient, AccessToken, AgentDispatchClient } = require("livekit-server-sdk");
const Agent = require("../models/Agent");

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_SIP_TRUNK_ID = process.env.LIVEKIT_SIP_TRUNK_ID;
const LIVEKIT_AGENT_NAME = (process.env.LIVEKIT_AGENT_NAME || "voice-agent").trim();

const getMissingConfig = () => {
  const missing = [];
  if (!LIVEKIT_URL) missing.push("LIVEKIT_URL");
  if (!LIVEKIT_API_KEY) missing.push("LIVEKIT_API_KEY");
  if (!LIVEKIT_API_SECRET) missing.push("LIVEKIT_API_SECRET");
  if (!LIVEKIT_SIP_TRUNK_ID) missing.push("LIVEKIT_SIP_TRUNK_ID");
  return missing;
};

const getSipClient = () =>
  new SipClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
const getDispatchClient = () =>
  new AgentDispatchClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

const getLivekitSipUriBase = () => (process.env.LIVEKIT_SIP_URI || "").trim();
const isE164 = (value) => /^\+[1-9]\d{6,14}$/.test((value || "").trim());

exports.handleTwilioVoiceWebhook = (req, res) => {
  console.log("Twilio request body:", req.body);

  const from = req.body?.From || "unknown";
  const to = req.body?.To || "unknown";
  console.log(`📞 Incoming call from ${from} to ${to}`);

  res.set("Content-Type", "text/xml");

  const livekitSipUriBase = getLivekitSipUriBase();
  const roomFromQuery = (req.query?.roomName || "").toString().trim();
  const roomName = roomFromQuery || `call-${Date.now()}`;

  if (!livekitSipUriBase) {
    console.log("❌ LIVEKIT_SIP_URI not set");
    return res.send(`
<Response>
  <Say>LiveKit SIP URI not configured</Say>
</Response>
`);
  }

  const separator = livekitSipUriBase.includes("?") ? "&" : "?";
  const sipUri = `${livekitSipUriBase}${separator}roomName=${encodeURIComponent(roomName)}`;

  console.log("➡️ Forwarding call to LiveKit SIP:", sipUri);

  return res.send(`
<Response>
  <Dial>
    <Sip>${sipUri}</Sip>
  </Dial>
</Response>
`);
};

exports.handleTwilioStatus = (req, res) => {
  const { CallSid, CallStatus, From, To, ErrorCode, ErrorMessage } = req.body || {};

  console.log("[Twilio Status]", {
    CallSid,
    CallStatus,
    From,
    To,
    ErrorCode,
    ErrorMessage,
  });

  return res.status(204).send();
};

exports.handleTwilioSipStatus = (req, res) => {
  console.log("[Twilio SIP Status]", req.body || {});
  return res.status(204).send();
};

exports.handleTwilioDialAction = (req, res) => {
  console.log("[Twilio Dial Action]", req.body || {});
  return res.status(204).send();
};

// Initiates an outbound SIP call using LiveKit SIP
exports.createOutboundCall = async (req, res) => {
  try {
    const missing = getMissingConfig();
    if (missing.length) {
      return res.status(500).json({
        error: `LiveKit config missing: ${missing.join(", ")}`,
      });
    }

    const { phoneNumber, fromNumber, agentId } = req.body;
    const normalizedPhone = (phoneNumber || "").trim();

    if (!normalizedPhone) {
      return res.status(400).json({
        error: "phoneNumber is required to make an outbound call.",
      });
    }
    if (!isE164(normalizedPhone)) {
      return res.status(400).json({
        error: "phoneNumber must be in E.164 format (example: +14155550123).",
      });
    }
    if (!agentId) {
      return res.status(400).json({
        error: "agentId is required.",
      });
    }

    const agent = await Agent.findById(agentId).select("_id name systemPrompt greeting");
    if (!agent) {
      return res.status(404).json({
        error: "Agent not found.",
      });
    }

    // Always generate dynamic room server-side
    const targetRoom = `room-${Date.now()}`;
    const participantIdentity = `user-${normalizedPhone.replace(/\+/g, "")}`;
    const callerId = (fromNumber || process.env.TWILIO_PHONE_NUMBER || "").trim();

    if (!callerId) {
      return res.status(400).json({
        error: "fromNumber is missing. Set req.body.fromNumber or TWILIO_PHONE_NUMBER in .env.",
      });
    }
    if (!isE164(callerId)) {
      return res.status(400).json({
        error: "fromNumber must be in E.164 format (example: +14155550123).",
      });
    }

    console.log(
      `[LiveKit Outbound] Dialing ${normalizedPhone} from ${callerId}, targeting room: ${targetRoom}`
    );

    const sipClient = getSipClient();

    const sipParticipant = await sipClient.createSipParticipant(
      LIVEKIT_SIP_TRUNK_ID,
      normalizedPhone,
      targetRoom,
      {
        participantIdentity,
        fromNumber: callerId,
      }
    );

    console.log("[LiveKit Outbound] SIP Participant created successfully:", sipParticipant);

    const agentIdentity = `agent-${String(agent._id)}`;
    const agentMetadata = JSON.stringify({
      role: "agent",
      agentId: String(agent._id),
      agentName: agent.name,
    });
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: agentIdentity,
      name: agent.name,
      metadata: agentMetadata,
    });
    at.addGrant({ roomJoin: true, room: targetRoom });
    const token = await at.toJwt();
    const dispatchMetadata = JSON.stringify({
      agentId: String(agent._id),
      agentName: agent.name,
      systemPrompt: agent.systemPrompt,
      greeting: agent.greeting,
    });
    const dispatch = await getDispatchClient().createDispatch(targetRoom, LIVEKIT_AGENT_NAME, {
      metadata: dispatchMetadata,
    });

    return res.json({
      message: "Outbound call initiated successfully",
      sipParticipant,
      roomName: targetRoom,
      token,
      dispatch,
      participantIdentity,
      agent: {
        id: agent._id,
        name: agent.name,
        identity: agentIdentity,
        metadata: agentMetadata,
      },
    });
  } catch (error) {
    console.error("[LiveKit Outbound] Error:", error);
    const message = error?.message || "Failed to initiate LiveKit outbound call";
    const status = error?.status || error?.code || 500;
    const isForbidden = String(message).includes("403") || Number(status) === 403;

    return res.status(500).json({
      error: message,
      hint: isForbidden
        ? "SIP 403 usually means your LiveKit SIP trunk/provider auth or allowed caller ID is rejecting the INVITE. Verify trunk credentials and fromNumber ownership in provider console."
        : undefined,
    });
  }
};

// Generates an access token for an agent or participant to join a LiveKit room
exports.generateToken = async (req, res) => {
  try {
    const missing = [];
    if (!LIVEKIT_API_KEY) missing.push("LIVEKIT_API_KEY");
    if (!LIVEKIT_API_SECRET) missing.push("LIVEKIT_API_SECRET");
    if (missing.length) {
      return res.status(500).json({
        error: `LiveKit config missing: ${missing.join(", ")}`,
      });
    }

    const { roomName, identity } = req.body;

    if (!roomName || !identity) {
      return res
        .status(400)
        .json({ error: "roomName and identity are required." });
    }

    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
    });

    at.addGrant({ roomJoin: true, room: roomName });
    const token = await at.toJwt();

    console.log(
      `[LiveKit Token] Generated token for ${identity} to join room ${roomName}`
    );

    return res.json({ token, roomName, identity });
  } catch (error) {
    console.error("[LiveKit Token Error]:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate LiveKit token",
    });
  }
};
