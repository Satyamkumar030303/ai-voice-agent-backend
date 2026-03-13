const axios = require("axios");

(async () => {
  try {
    const res = await axios.post("http://localhost:11434/api/generate", {
      model: "mistral",
      prompt: "Hello",
      stream: false
    });

    console.log("Ollama response:");
    console.log(res.data);
  } catch (err) {
    console.error("Error:", err.message);
  }
})();