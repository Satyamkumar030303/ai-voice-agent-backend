import { llm } from "@livekit/agents";
import { z } from "zod";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const TEMP_EMAIL_PATH = path.join(os.tmpdir(), "agent-vox-captured-email.json");

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createEmailCaptureTool() {
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

      await fs.writeFile(TEMP_EMAIL_PATH, JSON.stringify(payload, null, 2), "utf8");

      return {
        stored: true,
        filePath: TEMP_EMAIL_PATH,
        email: normalizedEmail,
      };
    },
  });
}

export { TEMP_EMAIL_PATH };
