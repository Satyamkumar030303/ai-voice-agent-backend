import { createRequire } from "node:module";
import { z } from "zod";
import { llm } from "@livekit/agents";

const require = createRequire(import.meta.url);
const {
  retrieveKnowledgeContext,
  getAgentKnowledgeInfo,
} = require("./knowledgeBaseService");

export async function getKnowledgeBaseRuntime(agentId) {
  if (!agentId) {
    return {
      hasKnowledgeBase: false,
      knowledgeBaseFiles: [],
      tool: undefined,
      guidance: "",
    };
  }

  const { knowledgeBaseIds, knowledgeBaseFiles } = await getAgentKnowledgeInfo(agentId);
  const hasKnowledgeBase = knowledgeBaseIds.length > 0;

  if (!hasKnowledgeBase) {
    return {
      hasKnowledgeBase: false,
      knowledgeBaseFiles,
      tool: undefined,
      guidance:
        "No knowledge base is attached to this agent. Do not claim you have document-backed context.",
    };
  }

  const tool = llm.tool({
    description:
      "Search the agent's attached knowledge base for facts from uploaded PDFs before answering document-specific questions.",
    parameters: z.object({
      query: z
        .string()
        .min(1)
        .describe("The user's question rewritten as a search query for the knowledge base."),
    }),
    execute: async ({ query }) => {
      console.log(`[KB Tool] Searching attached knowledge base for agent ${agentId}: ${query}`);
      const result = await retrieveKnowledgeContext(agentId, query);

      if (!result.matches.length) {
        console.log(`[KB Tool] No KB matches found for agent ${agentId}.`);
        return {
          found: false,
          files: result.knowledgeBaseFiles,
          context:
            "No relevant knowledge base passages were found for that question.",
        };
      }

      console.log(
        `[KB Tool] Found ${result.matches.length} KB matches for agent ${agentId}.`
      );
      return {
        found: true,
        files: result.knowledgeBaseFiles,
        context: result.context,
      };
    },
  });

  return {
    hasKnowledgeBase: true,
    knowledgeBaseFiles,
    tool,
    guidance: `You MUST call the tool "search_knowledge_base" for any question about the uploaded documents (${knowledgeBaseFiles.join(", ")}). 
Do not answer from your own knowledge. Only answer using the context returned from the tool.`
  };
}
