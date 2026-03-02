const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// console.log("API KEY:", process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
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