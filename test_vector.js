const fs = require("fs");
const mongoose = require("mongoose");
const KnowledgeChunk = require("./src/models/KnowledgeChunk");
require("dotenv").config();

async function test() {
    let log = "";
    const appendLog = (msg) => { log += msg + "\n"; console.log(msg); };

    await mongoose.connect(process.env.MONGO_URI);
    appendLog("Connected to MongoDB");

    const sampleChunk = await KnowledgeChunk.findOne();
    appendLog(`Sample chunk vector length: ${sampleChunk.embedding.length}`);

    try {
        appendLog("Testing $vectorSearch with fake index...");
        const matches = await KnowledgeChunk.aggregate([
            {
                $vectorSearch: {
                    index: "index_that_definitely_does_not_exist",
                    path: "embedding",
                    queryVector: sampleChunk.embedding,
                    numCandidates: 100,
                    limit: 5
                }
            }
        ]);
        appendLog(`$vectorSearch fake index returned ${matches.length} results`);
    } catch (err) {
        appendLog(`$vectorSearch FAKE index error: ${err.message}`);
    }

    fs.writeFileSync("test_vector_results.txt", log, "utf8");
    process.exit(0);
}
test();
