import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const TEMP_EMAIL_PATH = path.join(os.tmpdir(), "agent-vox-captured-email.json");

async function readStore() {
  try {
    const raw = await fs.readFile(TEMP_EMAIL_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeStore(store) {
  await fs.writeFile(TEMP_EMAIL_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function saveEmailForSession(sessionKey, payload) {
  if (!sessionKey) {
    throw new Error("sessionKey is required to store email.");
  }

  const store = await readStore();
  store[sessionKey] = {
    ...(store[sessionKey] || {}),
    ...payload,
  };
  await writeStore(store);
  return store[sessionKey];
}

export async function getEmailForSession(sessionKey) {
  if (!sessionKey) {
    return null;
  }
  const store = await readStore();
  return store[sessionKey] || null;
}

export { TEMP_EMAIL_PATH };
