import { createRequire } from "node:module";
import { llm } from "@livekit/agents";
import { z } from "zod";
import { getEmailForSession } from "./tempEmailStore.mjs";

const require = createRequire(import.meta.url);
const { createPaymentAndSendEmail } = require("../utils/Payment/paymentService");

export function createPaymentLinkTool(sessionKey) {
  return llm.tool({
    description:
      "Create a Stripe payment link for a product and email it to the user using the saved email address for this call.",
    parameters: z.object({
      product_id: z.string().min(1).describe("The product identifier."),
      name: z.string().min(1).describe("The product name."),
      price: z.number().positive().describe("The product price in USD."),
      description: z.string().optional().describe("Optional product description."),
    }),
    execute: async ({ product_id, name, price, description }) => {
      const savedEmail = await getEmailForSession(sessionKey);

      if (!savedEmail?.email) {
        throw new Error("No saved email found for this call. Ask the user for their email first.");
      }

      const result = await createPaymentAndSendEmail({
        product: {
          product_id,
          name,
          price,
          description: description || "",
        },
        userEmail: savedEmail.email,
      });

      return {
        success: true,
        userEmail: savedEmail.email,
        paymentUrl: result.paymentUrl,
        productName: name,
      };
    },
  });
}
