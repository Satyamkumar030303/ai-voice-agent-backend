// // ============================================================
// // AGENT — finds product from PDF + asks user for email
// // ============================================================

// import Anthropic from "@anthropic-ai/sdk";
// import { executeStripePaymentTool } from "./paymentTool.js";

// const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// // ============================================================
// // SESSION STORE — remembers email + conversation per user
// // ============================================================

// const sessions = {}; // { sessionId: { email, messages } }

// function getSession(sessionId) {
//   if (!sessions[sessionId]) {
//     sessions[sessionId] = { email: null, messages: [] };
//   }
//   return sessions[sessionId];
// }

// // ============================================================
// // TOOLS
// // ============================================================

// const tools = [

//   // TOOL 1: Search product in PDF
//   {
//     name: "search_product_in_pdf",
//     description: "Search for a product in the PDF knowledge base by name or description. Returns product details including product_id, name, price.",
//     input_schema: {
//       type: "object",
//       properties: {
//         query: {
//           type: "string",
//           description: "Product name or description to search for e.g. 'Pro Laptop'",
//         },
//       },
//       required: ["query"],
//     },
//   },

//   // TOOL 2: Save user email to memory
//   {
//     name: "save_email",
//     description: "Save the user's email address. Call this as soon as the user provides their email.",
//     input_schema: {
//       type: "object",
//       properties: {
//         email: {
//           type: "string",
//           description: "User's email address e.g. akash@gmail.com",
//         },
//       },
//       required: ["email"],
//     },
//   },

//   // TOOL 3: Create payment link and send email
//   {
//     name: "create_payment_and_send_email",
//     description: "Create a Stripe payment link for the product and send it to the user's email. Only call this when you have BOTH the product details AND the user's email.",
//     input_schema: {
//       type: "object",
//       properties: {
//         product_id: {
//           type: "string",
//           description: "Product ID from PDF e.g. P001",
//         },
//         product_name: {
//           type: "string",
//           description: "Product name e.g. Pro Laptop",
//         },
//         product_price: {
//           type: "number",
//           description: "Product price in dollars e.g. 999",
//         },
//         product_description: {
//           type: "string",
//           description: "Product description",
//         },
//         user_email: {
//           type: "string",
//           description: "User's email address",
//         },
//       },
//       required: ["product_id", "product_name", "product_price", "user_email"],
//     },
//   },

// ];

// // ============================================================
// // TOOL EXECUTOR — runs when LLM calls a tool
// // ============================================================

// async function executeTool(toolName, toolInput, sessionId) {
//   const session = getSession(sessionId);

//   // TOOL 1: Search PDF
//   if (toolName === "search_product_in_pdf") {
//     // Call your existing PDF search function here
//     const result = await yourExistingPdfSearch(toolInput.query); // ← replace with your function
//     return result;
//     // should return: { found: true, product_id: "P001", name: "Pro Laptop", price: 999, description: "..." }
//   }

//   // TOOL 2: Save email
//   if (toolName === "save_email") {
//     session.email = toolInput.email; // ← save to session
//     console.log(`✅ Email saved: ${toolInput.email}`);
//     return {
//       success: true,
//       message: `Email ${toolInput.email} saved. I will remember this.`,
//     };
//   }

//   // TOOL 3: Create payment link
//   if (toolName === "create_payment_and_send_email") {
//     // Always use saved email from session (more reliable)
//     const emailToUse = session.email || toolInput.user_email;
//     const result = await executeStripePaymentTool({
//       ...toolInput,
//       user_email: emailToUse,
//     });
//     return result;
//   }
// }

// // ============================================================
// // MAIN AGENT FUNCTION
// // ============================================================

// export async function runAgent(sessionId, userMessage) {
//   const session = getSession(sessionId);

//   console.log(`\n👤 Session: ${sessionId}`);
//   console.log(`📨 User: ${userMessage}`);
//   console.log(`📧 Saved email: ${session.email || "not saved yet"}`);

//   // Add user message to history
//   session.messages.push({ role: "user", content: userMessage });

//   // System prompt
//   const systemPrompt = `You are a helpful shopping assistant.

// Your job:
// 1. When user wants to buy something → search the PDF for product details
// 2. If you don't have the user's email → ask for it politely
// 3. Once you have product details AND email → create the payment link

// ${session.email
//     ? `User email is already saved: ${session.email}. Do NOT ask for it again.`
//     : `You don't have the user's email yet. Ask for it if they want to buy.`
//   }

// Important rules:
// - Search PDF first to find product_id, name, price
// - Ask for email if not saved
// - Save email using save_email tool as soon as user provides it
// - Only call create_payment_and_send_email when you have BOTH product + email
// - After sending payment link tell user: "Check your email for the payment link!"`;

//   // Agentic loop
//   while (true) {
//     const response = await anthropic.messages.create({
//       model: "claude-sonnet-4-6",
//       max_tokens: 1024,
//       system: systemPrompt,
//       tools,
//       messages: session.messages, // ← full history = memory
//     });

//     console.log(`🔄 Stop reason: ${response.stop_reason}`);

//     // Agent finished
//     if (response.stop_reason === "end_turn") {
//       const finalText = response.content
//         .filter((b) => b.type === "text")
//         .map((b) => b.text)
//         .join("");

//       session.messages.push({ role: "assistant", content: finalText });
//       console.log(`🤖 Agent: ${finalText}`);
//       return finalText;
//     }

//     // Agent wants to use a tool
//     if (response.stop_reason === "tool_use") {
//       session.messages.push({ role: "assistant", content: response.content });

//       const toolResults = [];

//       for (const block of response.content) {
//         if (block.type === "tool_use") {
//           console.log(`🔧 Tool: ${block.name}`, block.input);

//           let result;
//           try {
//             result = await executeTool(block.name, block.input, sessionId);
//           } catch (err) {
//             result = { success: false, error: err.message };
//           }

//           console.log(`📤 Result:`, result);

//           toolResults.push({
//             type: "tool_result",
//             tool_use_id: block.id,
//             content: JSON.stringify(result),
//           });
//         }
//       }

//       session.messages.push({ role: "user", content: toolResults });
//     } else {
//       break;
//     }
//   }

//   return "Sorry, something went wrong.";
// }

// // ============================================================
// // CLEAR SESSION
// // ============================================================

// export function clearSession(sessionId) {
//   delete sessions[sessionId];
//   console.log(`🗑️ Session cleared: ${sessionId}`);
// }