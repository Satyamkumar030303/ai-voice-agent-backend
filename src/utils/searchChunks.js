function searchChunks(chunks, query) {
  const words = query.toLowerCase().split(" ");

  return chunks.filter(chunk => {
    const lowerChunk = chunk.toLowerCase();

    return words.some(word => lowerChunk.includes(word));
  });
}

module.exports = searchChunks;