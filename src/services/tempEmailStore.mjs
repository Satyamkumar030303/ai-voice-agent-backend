import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const mongoose = require("mongoose");
const SessionEmail = require("../models/sessionEmail");

let mongoConnectPromise = null;

async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required to store session email in MongoDB.");
  }

  if (!mongoConnectPromise) {
    mongoConnectPromise = mongoose.connect(process.env.MONGO_URI);
  }

  try {
    await mongoConnectPromise;
    return mongoose.connection;
  } catch (error) {
    mongoConnectPromise = null;
    throw error;
  }
}

export async function saveEmailForSession(sessionKey, payload) {
  if (!sessionKey) {
    throw new Error("sessionKey is required to store email.");
  }

  await ensureMongoConnection();

  const doc = await SessionEmail.findOneAndUpdate(
    { sessionKey },
    {
      sessionKey,
      ...payload,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return doc;
}

export async function getEmailForSession(sessionKey) {
  if (!sessionKey) {
    return null;
  }

  await ensureMongoConnection();
  return SessionEmail.findOne({ sessionKey }).lean();
}

export const TEMP_EMAIL_PATH = "mongodb://SessionEmail";
