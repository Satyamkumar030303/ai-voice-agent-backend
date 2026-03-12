import express from "express";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();


const app = express();

// ============================================================
// ✅ STEP 1: PASTE YOUR KEYS HERE
// ============================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET    = process.env.WEBHOOK_SECRET;
const MONGO_URL         = process.env.MONGO_URL;
const GMAIL_USER        = process.env.GMAIL_USER;
const GMAIL_PASSWORD    = process.env.GMAIL_PASSWORD; // is App Password
const SUCCESS_URL       = process.env.SUCCESS_URL;

// ============================================================
// ✅ STEP 2: CONNECT TO MONGODB
// ============================================================

await mongoose.connect(MONGO_URL);
console.log("✅ MongoDB connected");

// Order Schema — saved when payment is successful
const Order = mongoose.model("Order", new mongoose.Schema({
  user_email:            { type: String, required: true },
  product_id:            { type: String },
  product_name:          { type: String, required: true },
  amount:                { type: Number, required: true }, // in cents
  stripe_session_id:     { type: String, unique: true },
  stripe_payment_intent: { type: String },
  status:                { type: String, default: "completed" },
  created_at:            { type: Date, default: Date.now },
}));

// ============================================================
// ✅ STEP 3: SETUP STRIPE + EMAIL
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

// Auto create product on Stripe if it doesn't exist yet
async function getOrCreateStripePrice(product) {
  // product = { product_id, name, price, description }

  const existing = await stripe.products.search({
    query: `metadata["internal_id"]:"${product.product_id}"`,
  });

  if (existing.data.length > 0) {
    const prices = await stripe.prices.list({
      product: existing.data[0].id,
      limit: 1,
      active: true,
    });
    console.log(`✅ Found existing Stripe product: ${product.name}`);
    return prices.data[0].id;
  }

  // Create new product + price on Stripe
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
}

// Create Stripe payment link
async function createPaymentLink(stripePriceId, userEmail, productName) {
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
  return paymentLink.url; // https://buy.stripe.com/xxx
}

// Send payment link to user email
async function sendPaymentEmail(userEmail, paymentUrl, productName, price) {
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
  console.log(`✅ Email sent to ${userEmail}`);
}

// Save completed order to MongoDB
async function saveOrder(userEmail, productId, productName, amount, sessionId, paymentIntent) {
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
    { upsert: true, new: true }
  );
  console.log(`✅ Order saved in MongoDB: ${userEmail} bought ${productName}`);
}

// ============================================================
// ✅ STEP 4: WEBHOOK — must be BEFORE express.json()
// Stripe needs raw body to verify the signature
// ============================================================

app.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Invalid webhook signature:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  console.log(`📥 Webhook received: ${event.type}`);

  // Payment completed successfully
  if (event.type === "checkout.session.completed") {
    const session       = event.data.object;
    const userEmail     = session.metadata?.user_email;
    const productName   = session.metadata?.product_name;
    const amount        = session.amount_total;
    const sessionId     = session.id;
    const paymentIntent = session.payment_intent;

    console.log(`💰 Payment successful: ${userEmail} paid for ${productName}`);
    await saveOrder(userEmail, null, productName, amount, sessionId, paymentIntent);
  }

  res.json({ received: true });
});

// ============================================================
// ✅ STEP 5: API ROUTES
// ============================================================

app.use(express.json());

// Your agent calls this after finding product from PDF
// POST /stripe/create-payment
// Body: { product: { product_id, name, price, description }, userEmail: "user@example.com" }
app.post("/stripe/create-payment", async (req, res) => {
  const { product, userEmail } = req.body;

  if (!product || !userEmail) {
    return res.status(400).json({ error: "product and userEmail are required" });
  }

  try {
    console.log(`\n🛒 ${userEmail} wants to buy: ${product.name}`);

    const stripePriceId = await getOrCreateStripePrice(product);   // 1. get/create on Stripe
    const paymentUrl    = await createPaymentLink(stripePriceId, userEmail, product.name); // 2. payment link
    await sendPaymentEmail(userEmail, paymentUrl, product.name, product.price);            // 3. send email

    res.json({ success: true, paymentUrl });

  } catch (err) {
    console.error("❌ Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all orders for a user
// GET /orders/user@example.com
app.get("/orders/:email", async (req, res) => {
  try {
    const orders = await Order.find({ user_email: req.params.email }).sort({ created_at: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Success page after payment
app.get("/success", (req, res) => {
  res.send("<h1>✅ Payment Successful! Thank you for your purchase.</h1>");
});

// ============================================================
// START SERVER
// ============================================================

app.listen(3000, () => {
  console.log("\n🚀 Server running on http://localhost:3000");
  console.log("─────────────────────────────────────────────────────");
  console.log("POST /stripe/create-payment  → your agent calls this");
  console.log("POST /stripe/webhook         → Stripe calls after payment");
  console.log("GET  /orders/:email          → get orders for a user");
  console.log("GET  /success                → redirect page after payment");
  console.log("─────────────────────────────────────────────────────");
  console.log("\n📌 Open a second terminal and run:");
  console.log("stripe listen --forward-to localhost:3000/stripe/webhook\n");
});


// stcppyuoiywliepz