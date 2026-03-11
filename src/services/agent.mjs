import { AutoSubscribe, ServerOptions, cli, defineAgent, voice } from "@livekit/agents";
import { RoomEvent } from "@livekit/rtc-node";
import * as google from "@livekit/agents-plugin-google";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { getKnowledgeBaseRuntime } from "./knowledgeBaseTool.mjs";

const AGENT_NAME = process.env.LIVEKIT_AGENT_NAME || "voice-agent";
const DEFAULT_GREETING = "Hello! This is your AI assistant calling. How can I help you today?";
const DEFAULT_INSTRUCTIONS =
  "You are a phone-based AI assistant. Speak clearly, briefly, and helpfully.";

if (process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}
const parseJobMetadata = (metadata) => {
  if (!metadata) {
    return {};
  }

  try {
    return JSON.parse(metadata);
  } catch (error) {
    console.warn("Failed to parse LiveKit job metadata:", error);
    return {};
  }
};

export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    console.log(`Agent joining room: ${ctx.room.name}`);

    const participant = await ctx.waitForParticipant();
    console.log(`Participant ${participant.identity} connected. Starting voice session...`);

    const metadata = parseJobMetadata(ctx.job?.metadata);
    const kbRuntime = await getKnowledgeBaseRuntime(metadata.agentId);
    const instructionsParts = [metadata.systemPrompt || DEFAULT_INSTRUCTIONS];
    if (kbRuntime.guidance) {
      instructionsParts.push(kbRuntime.guidance);
    }
    const instructions = instructionsParts.join("\n\n");
    const greeting = metadata.greeting || DEFAULT_GREETING;

    const deepgram = await import("@livekit/agents-plugin-deepgram");
    const session = new voice.AgentSession({
      stt: new deepgram.STT(),
      llm: new google.LLM({
        model: "gemini-2.5-flash-lite",
        apiKey: process.env.GEMINI_API_KEY,
      }),
      tts: new deepgram.TTS({
        model: "aura-asteria-en",
      }),
    });

    const agent = new voice.Agent({
      instructions,
      tools: kbRuntime.tool
        ? {
            search_knowledge_base: kbRuntime.tool,
          }
        : undefined,
    });

    await session.start({
      agent,
      room: ctx.room,
    });
    console.log("Voice agent session started.");

    const greetingHandle = session.say(greeting, {
      allowInterruptions: true,
    });
    await greetingHandle.waitForPlayout();

    // Keep the job alive for the duration of the call. If entry returns,
    // LiveKit shuts the job down and the agent stops publishing audio.
    await new Promise((resolve) => {
      const finish = () => {
        ctx.room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
        ctx.room.off(RoomEvent.Disconnected, finish);
        resolve();
      };

      const onParticipantDisconnected = (remoteParticipant) => {
        if (remoteParticipant.identity === participant.identity) {
          finish();
        }
      };

      ctx.room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      ctx.room.on(RoomEvent.Disconnected, finish);
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: AGENT_NAME,
  }),
);
