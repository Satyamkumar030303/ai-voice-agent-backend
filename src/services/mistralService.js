const axios = require("axios");

async function askMistral(prompt) {
  const res = await axios.post("http://localhost:11434/api/generate", {
    model: "mistral",
    prompt: prompt,
    stream: false,
    options: {
      temperature: 0.4,
      num_predict: 120
    }
  });

  return res.data.response;
}

module.exports = { askMistral };