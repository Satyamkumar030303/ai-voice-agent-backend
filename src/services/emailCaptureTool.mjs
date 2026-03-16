import { llm } from "@livekit/agents";
import { z } from "zod";
import { saveEmailForSession,TEMP_EMAIL_PATH }  from "./tempEmailStore.mjs";

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createEmailCaptureTool(sessionKey) {
  return llm.tool({
    description:
      "Store the user's spoken email address in a temporary JSON file for later use. Call this only after confirming the email address with the user.",
    parameters: z.object({
      email: z.string().min(3).describe("The user's email address."),
      name: z
        .string()
        .optional()
        .describe("Optional name of the person who provided the email."),
      note: z
        .string()
        .optional()
        .describe("Optional short note about why the email was captured."),
    }),
    execute: async ({ email, name, note }) => {
      const normalizedEmail = normalizeEmail(email);

      if (!isValidEmail(normalizedEmail)) {
        throw new Error(`Invalid email address: ${email}`);
      }

      const payload = {
        email: normalizedEmail,
        name: (name || "").trim() || null,
        note: (note || "").trim() || null,
        capturedAt: new Date().toISOString(),
        source: "voice-agent",
      };

      await saveEmailForSession(sessionKey, payload);

      return {
        stored: true,
        storage: TEMP_EMAIL_PATH,
        sessionKey,
        email: normalizedEmail,
      };
    },
  });
}

export { TEMP_EMAIL_PATH };
