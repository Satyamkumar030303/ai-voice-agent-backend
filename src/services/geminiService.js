const GROQ_BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const HF_EMBEDDING_MODEL =
  process.env.HF_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";
const HF_EXPECTED_DIMENSIONS = Number(process.env.HF_EMBEDDING_DIMENSIONS || 384);


// Prioritize GOOGLE_API_KEY as it is the currently active billing key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

async function askGemini(prompt) {
  const result = await model.generateContent(prompt);
  return result.response.text();

function getDefaultHfEmbeddingUrl(model) {
  return `https://router.huggingface.co/hf-inference/models/${model}/pipeline/feature-extraction`;

}

function normalizeHfEmbeddingUrl(url, model) {
  const trimmed = (url || "").trim();
  if (!trimmed) {
    return getDefaultHfEmbeddingUrl(model);
  }

  if (trimmed.includes("api-inference.huggingface.co")) {
    return getDefaultHfEmbeddingUrl(model);
  }

  return trimmed;
}

const HF_EMBEDDING_URL = normalizeHfEmbeddingUrl(
  process.env.HF_EMBEDDING_URL,
  HF_EMBEDDING_MODEL
);

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function meanPoolEmbedding(matrix) {
  const rows = Array.isArray(matrix) ? matrix : [];
  if (!rows.length || !Array.isArray(rows[0])) {
    throw new Error("Unexpected Hugging Face embedding response shape.");
  }

  const dimensions = rows[0].length;
  const pooled = new Array(dimensions).fill(0);

  for (const row of rows) {
    for (let index = 0; index < dimensions; index += 1) {
      pooled[index] += Number(row[index] || 0);
    }
  }

  return pooled.map((value) => value / rows.length);
}

function normalizeEmbeddingResponse(payload) {
  if (!Array.isArray(payload) || !payload.length) {
    throw new Error("Empty embedding response received from Hugging Face.");
  }

  if (typeof payload[0] === "number") {
    return payload.map((value) => Number(value));
  }

  if (Array.isArray(payload[0]) && typeof payload[0][0] === "number") {
    return meanPoolEmbedding(payload);
  }

  if (
    Array.isArray(payload[0]) &&
    Array.isArray(payload[0][0]) &&
    typeof payload[0][0][0] === "number"
  ) {
    return meanPoolEmbedding(payload[0]);
  }

  throw new Error("Unsupported embedding response format from Hugging Face.");
}

async function askGroq(prompt) {
  const apiKey = getRequiredEnv("GROQ_API_KEY");
  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq chat request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return payload.choices?.[0]?.message?.content?.trim() || "";
}

async function embedWithHuggingFace(text) {
  const apiKey = getRequiredEnv("HUGGINGFACE_API_KEY");
  const response = await fetch(HF_EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      inputs: text,
      options: {
        wait_for_model: true,
        use_cache: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Hugging Face embedding request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const vector = normalizeEmbeddingResponse(payload);

  if (vector.length !== HF_EXPECTED_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch. Expected ${HF_EXPECTED_DIMENSIONS}, received ${vector.length}.`
    );
  }

  return vector;
}

module.exports = { askGemini, embedGemini };
