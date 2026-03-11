const { GoogleGenerativeAI } = require("@google/generative-ai");

// Prioritize GOOGLE_API_KEY as it is the currently active billing key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

async function askGemini(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();
}
const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

async function embedGemini(text) {
  const result = await embeddingModel.embedContent({
    content: {
      parts: [{ text }]
    }
  });

  return result.embedding.values;
}

module.exports = { askGemini, embedGemini };