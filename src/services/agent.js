// src/services/agent.js
const { defineAgent, voice, cli, ServerOptions } = require('@livekit/agents');
const google = require('@livekit/agents-plugin-google');
require('dotenv').config();

module.exports = defineAgent({
    entry: async ({ room, participant }) => {
        console.log(`Agent joining room: ${room.name}`);

        // 1. Initialize Deepgram Speech-to-Text (Transcribes caller audio)
        const deepgram = require('@livekit/agents-plugin-deepgram');
        const stt = new deepgram.STT();

        // 2. Initialize the Google Gemini Text LLM
        const llm = new google.LLM({
            model: "gemini-2.5-flash-lite",
            apiKey: process.env.GOOGLE_API_KEY,
        });

        // 3. Initialize Google Text-to-Speech (Speaks the AI's response)
        const tts = new google.beta.TTS({
            credentials: { apiKey: process.env.GOOGLE_API_KEY }
        });

        // 4. Create the Voice Agent Pipeline
        const agent = new voice.Agent({
            stt: stt,
            llm: llm,
            tts: tts,
        });

        // 5. Connect to the room and Auto Subscribe to the caller's audio
        await room.connect(process.env.LIVEKIT_URL, process.env.LIVEKIT_API_KEY, {
            autoSubscribe: true,
        });

        // 6. Start the pipeline
        await agent.start({
            room: room,
            participant: participant
        });
        console.log("Voice Agent started and listening with Gemini 2.5 Flash Lite!");

        // 7. Have the agent greet the caller instantly
        agent.play(
            agent.tts.synthesize("Hello! This is your AI assistant calling. How can I help you today?")
        );
    }
});

cli.runApp(
    new ServerOptions({
        agent: __filename,
    })
);