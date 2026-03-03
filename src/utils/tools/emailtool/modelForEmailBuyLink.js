import { ChatOpenAI } from "langchain/chat_models/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { findProductTool } from "./emailProductBuyLink";
import { sendEmailTool} from "./sendMailtool"

const llm = new ChatOpenAI({
  temperature: 0,
  modelName: "gpt-4o-mini",
});

// export async function createAgent(userEmail) {
//   const executor = await initializeAgentExecutorWithOptions(
//     [findProductTool, sendEmailTool],
//     llm,
//     {
//       agentType: "openai-functions",
//       systemMessage: `
// You are a shopping assistant.
// If user wants to buy a product:
// 1. Find the product
// 2. Send buy link to user's email (${userEmail})
// 3. Confirm action to user
// `
//     }
//   );

//   return executor;
// }


const modelWithTools = model.bindTools([
  findProductTool,
  sendEmailTool,
]);

const response = await modelWithTools.invoke(
  "I want to buy iPhone 15"
);