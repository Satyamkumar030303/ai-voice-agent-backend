import express from "express";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// ============================================================
// CONFIGURATION — values come from .env file
// ============================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const MONGO_URL = process.env.MONGO_URL;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;
const SUCCESS_URL = process.env.SUCCESS_URL || "http://localhost:3000/success";

// ============================================================
// MONGODB
// ============================================================

try {
  await mongoose.connect(MONGO_URL);
  console.log("✅ MongoDB connected");
} catch (err) {
  console.error("❌ MongoDB connection failed:", err.message);
  process.exit(1); // stop server if DB fails
}

const Order = mongoose.model(
  "Order",
  new mongoose.Schema({
    user_email: { type: String, required: true },
    product_id: { type: String },
    product_name: { type: String, required: true },
    amount: { type: Number, required: true }, // in cents
    stripe_session_id: { type: String, unique: true },
    stripe_payment_intent: { type: String },
    status: { type: String, default: "completed" },
    created_at: { type: Date, default: Date.now },
  }),
);

// ============================================================
// STRIPE + EMAIL SETUP
// ============================================================

const stripe = new Stripe(STRIPE_SECRET_KEY);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASSWORD,
  },
});

// ============================================================
// STRIPE FUNCTIONS
// ============================================================

async function getOrCreateStripePrice(product) {
  try {
    // Search if product already exists on Stripe
    const existing = await stripe.products.search({
      query: `metadata["internal_id"]:"${product.product_id}"`,
    });

    if (existing.data.length > 0) {
      // Product exists — get its price
      const prices = await stripe.prices.list({
        product: existing.data[0].id,
        limit: 1,
        active: true,
      });

      if (!prices.data.length) {
        throw new Error(`No active price found for product: ${product.name}`);
      }

      console.log(`✅ Found existing Stripe product: ${product.name}`);
      return prices.data[0].id;
    }

    // Product does not exist — create it
    const stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description || "",
      metadata: { internal_id: product.product_id },
    });

    const stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: Math.round(product.price * 100), // dollars → cents
      currency: "usd",
    });

    console.log(`✅ Created on Stripe: ${product.name} → ${stripePrice.id}`);
    return stripePrice.id;
  } catch (err) {
    console.error("❌ Stripe product/price error:", err.message);
    throw new Error(`Failed to get or create Stripe price: ${err.message}`);
  }
}

async function createPaymentLink(stripePriceId, userEmail, productName) {
  try {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: stripePriceId, quantity: 1 }],
      after_completion: {
        type: "redirect",
        redirect: { url: SUCCESS_URL },
      },
      metadata: {
        user_email: userEmail,
        product_name: productName,
      },
    });

    console.log(`✅ Payment link created: ${paymentLink.url}`);
    return paymentLink.url;
  } catch (err) {
    console.error("❌ Payment link creation failed:", err.message);
    throw new Error(`Failed to create payment link: ${err.message}`);
  }
}

// ============================================================
// EMAIL 1 — Payment Link (sent BEFORE payment)
// ============================================================

async function sendPaymentLinkEmail(userEmail, paymentUrl, productName, price) {
  try {
    await transporter.sendMail({
      from: GMAIL_USER,
      to: userEmail,
      subject: `Your Payment Link - ${productName}`,
      text: `Your payment link for ${productName} ($${price}): ${paymentUrl}`,
      html: `
        <body style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
          <h2>Your Order is Ready! 🛍️</h2>
          <p>Here's your payment link for <strong>${productName}</strong>:</p>
          <div style="background:#f5f5f5; padding:20px; border-radius:8px; margin:20px 0;">
            <p style="margin:0; font-size:18px;">💰 Price: <strong>$${price}</strong></p>
          </div>
          <a href="${paymentUrl}"
             style="background:#635BFF; color:white; padding:14px 28px;
                    text-decoration:none; border-radius:6px; display:inline-block; font-size:16px;">
            Pay Now →
          </a>
          <p style="color:#888; font-size:12px; margin-top:20px;">Secured by Stripe.</p>
        </body>
      `,
    });
    console.log(`✅ Payment link email sent to ${userEmail}`);
  } catch (err) {
    console.error("❌ Failed to send payment link email:", err.message);
    throw new Error(`Failed to send payment link email: ${err.message}`);
  }
}

// ============================================================
// EMAIL 2 — Payment Success (sent AFTER payment)
// ============================================================

async function sendSuccessEmail(userEmail, productName, amount) {
  try {
    const price = (amount / 100).toFixed(2); // cents → dollars

    await transporter.sendMail({
      from: GMAIL_USER,
      to: userEmail,
      subject: `✅ Payment Confirmed - ${productName}`,
      text: `Your payment of $${price} for ${productName} was successful! Thank you.`,
      html: `
        <body style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">

          <div style="background:#22c55e; padding:24px; border-radius:8px; text-align:center; margin-bottom:24px;">
            <h2 style="color:white; margin:0;">✅ Payment Successful!</h2>
          </div>

          <p style="font-size:16px;">Hi there! Your payment has been confirmed. Here's your order summary:</p>

          <div style="background:#f5f5f5; padding:20px; border-radius:8px; margin:20px 0;">
            <table style="width:100%; border-collapse:collapse;">
              <tr style="border-bottom:1px solid #ddd;">
                <td style="padding:10px 0; color:#666;">Product</td>
                <td style="padding:10px 0; font-weight:bold; text-align:right;">${productName}</td>
              </tr>
              <tr style="border-bottom:1px solid #ddd;">
                <td style="padding:10px 0; color:#666;">Amount Paid</td>
                <td style="padding:10px 0; font-weight:bold; text-align:right; color:#22c55e;">$${price}</td>
              </tr>
              <tr>
                <td style="padding:10px 0; color:#666;">Status</td>
                <td style="padding:10px 0; font-weight:bold; text-align:right; color:#22c55e;">✅ Confirmed</td>
              </tr>
            </table>
          </div>

          <p style="font-size:16px;">Thank you for your purchase! 🎉</p>
          <p style="color:#888; font-size:12px;">If you have any questions, reply to this email.</p>

        </body>
      `,
    });
    console.log(`✅ Success confirmation email sent to ${userEmail}`);
  } catch (err) {
    console.error("❌ Failed to send success email:", err.message);
    throw new Error(`Failed to send success email: ${err.message}`);
  }
}

// ============================================================
// SAVE ORDER TO MONGODB
// ============================================================

async function saveOrder(
  userEmail,
  productId,
  productName,
  amount,
  sessionId,
  paymentIntent,
) {
  try {
    await Order.findOneAndUpdate(
      { stripe_session_id: sessionId },
      {
        user_email: userEmail,
        product_id: productId,
        product_name: productName,
        amount,
        stripe_session_id: sessionId,
        stripe_payment_intent: paymentIntent,
        status: "completed",
        created_at: new Date(),
      },
      { upsert: true, new: true },
    );
    console.log(
      `✅ Order saved in MongoDB: ${userEmail} bought ${productName}`,
    );
  } catch (err) {
    console.error("❌ Failed to save order to MongoDB:", err.message);
    throw new Error(`Failed to save order: ${err.message}`);
  }
}

// ============================================================
// WEBHOOK — must be BEFORE express.json()
// Fires after user completes payment → saves order + sends Email 2
// ============================================================

app.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;

    // Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("❌ Invalid webhook signature:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    console.log(`📥 Webhook received: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userEmail = session.metadata?.user_email;
      const productName = session.metadata?.product_name;
      const amount = session.amount_total;
      const sessionId = session.id;
      const paymentIntent = session.payment_intent;

      // Validate metadata
      if (!userEmail || !productName) {
        console.error("❌ Missing metadata in webhook session");
        return res.status(400).json({ error: "Missing metadata" });
      }

      console.log(
        `💰 Payment successful: ${userEmail} paid for ${productName}`,
      );

      // 1. Save order to MongoDB
      try {
        await saveOrder(
          userEmail,
          null,
          productName,
          amount,
          sessionId,
          paymentIntent,
        );
      } catch (err) {
        console.error("❌ Order save failed:", err.message);
        // Still continue to send email even if DB fails
      }

      // 2. Send success confirmation email
      try {
        await sendSuccessEmail(userEmail, productName, amount);
      } catch (err) {
        console.error("❌ Success email failed:", err.message);
        // Still return 200 to Stripe so it doesn't retry
      }
    }

    res.json({ received: true });
  },
);

const paymentCroller = {
  createpayment: async (req, res) => {
    const { product, userEmail } = req.body;

    // Validate request body
    if (!product || !userEmail) {
      return res
        .status(400)
        .json({ error: "product and userEmail are required" });
    }

    if (!product.product_id || !product.name || !product.price) {
      return res
        .status(400)
        .json({ error: "product must have product_id, name and price" });
    }

    try {
      console.log(`\n🛒 ${userEmail} wants to buy: ${product.name}`);

      // 1. Get or create product on Stripe
      const stripePriceId = await getOrCreateStripePrice(product);

      // 2. Create payment link
      const paymentUrl = await createPaymentLink(
        stripePriceId,
        userEmail,
        product.name,
      );

      // 3. Send Email 1 — payment link email
      await sendPaymentLinkEmail(
        userEmail,
        paymentUrl,
        product.name,
        product.price,
      );

      res.json({ success: true, paymentUrl });
    } catch (err) {
      console.error("❌ Create payment error:", err.message);
      res.status(500).json({ error: err.message });
    }
  },
  createpaymentbytool: async (product, userEmail) => {
    // Validate request body
    if (!product || !userEmail) {
      console.log("error in paymentcontroller arguments")
    }

    if (!product.product_id || !product.name || !product.price) {
        console.log( "product must have product_id, name and price" );
    }

    try {
      console.log(`\n🛒 ${userEmail} wants to buy: ${product.name}`);

      // 1. Get or create product on Stripe
      const stripePriceId = await getOrCreateStripePrice(product);

      // 2. Create payment link
      const paymentUrl = await createPaymentLink(
        stripePriceId,
        userEmail,
        product.name,
      );

      // 3. Send Email 1 — payment link email
      await sendPaymentLinkEmail(
        userEmail,
        paymentUrl,
        product.name,
        product.price,
      );

      console.log(`success: true, ${paymentUrl} `);
    } catch (err) {
      console.error("❌ Create payment error:", err.message);
      
    }
  },
  findorders: async (req, res) => {
    try {
      const orders = await Order.find({ user_email: req.params.email }).sort({
        created_at: -1,
      });
      res.json({ orders });
    } catch (err) {
      console.error("❌ Failed to fetch orders:", err.message);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  },
};

export default paymentCroller;
