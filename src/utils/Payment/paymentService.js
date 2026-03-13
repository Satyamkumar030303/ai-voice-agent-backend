const mongoose = require("mongoose");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;
const SUCCESS_URL = process.env.SUCCESS_URL || "http://localhost:3000/success";

function getStripeClient() {
  try {
    const Stripe = require("stripe");
    return new Stripe(STRIPE_SECRET_KEY);
  } catch (error) {
    throw new Error("Stripe package is not installed. Run npm install in ai-voice-agent-backend.");
  }
}

function getTransporter() {
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASSWORD,
    },
  });
}

const orderSchema = new mongoose.Schema({
  user_email: { type: String, required: true },
  product_id: { type: String },
  product_name: { type: String, required: true },
  amount: { type: Number, required: true },
  stripe_session_id: { type: String, unique: true },
  stripe_payment_intent: { type: String },
  status: { type: String, default: "completed" },
  created_at: { type: Date, default: Date.now },
});

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

function validatePaymentInput(product, userEmail) {
  if (!product || !userEmail) {
    throw new Error("product and userEmail are required");
  }

  if (!product.product_id || !product.name || !product.price) {
    throw new Error("product must have product_id, name and price");
  }

  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required.");
  }

  if (!GMAIL_USER || !GMAIL_PASSWORD) {
    throw new Error("GMAIL_USER and GMAIL_PASSWORD are required.");
  }
}

async function getOrCreateStripePrice(product) {
  const stripe = getStripeClient();
  const existing = await stripe.products.search({
    query: `metadata["internal_id"]:"${product.product_id}"`,
  });

  if (existing.data.length > 0) {
    const prices = await stripe.prices.list({
      product: existing.data[0].id,
      limit: 1,
      active: true,
    });

    if (!prices.data.length) {
      throw new Error(`No active price found for product: ${product.name}`);
    }

    return prices.data[0].id;
  }

  const stripeProduct = await stripe.products.create({
    name: product.name,
    description: product.description || "",
    metadata: { internal_id: product.product_id },
  });

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: Math.round(Number(product.price) * 100),
    currency: "usd",
  });

  return stripePrice.id;
}

async function createPaymentLink(stripePriceId, userEmail, productName) {
  const stripe = getStripeClient();
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

  return paymentLink.url;
}

async function sendPaymentLinkEmail(userEmail, paymentUrl, productName, price) {
  await getTransporter().sendMail({
    from: GMAIL_USER,
    to: userEmail,
    subject: `Your Payment Link - ${productName}`,
    text: `Your payment link for ${productName} ($${price}): ${paymentUrl}`,
    html: `
      <body style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
        <h2>Your Order is Ready!</h2>
        <p>Here is your payment link for <strong>${productName}</strong>:</p>
        <p><strong>Price:</strong> $${price}</p>
        <p><a href="${paymentUrl}">Pay Now</a></p>
        <p style="color:#888; font-size:12px;">Secured by Stripe.</p>
      </body>
    `,
  });
}

async function sendSuccessEmail(userEmail, productName, amount) {
  const price = (amount / 100).toFixed(2);

  await getTransporter().sendMail({
    from: GMAIL_USER,
    to: userEmail,
    subject: `Payment Confirmed - ${productName}`,
    text: `Your payment of $${price} for ${productName} was successful.`,
    html: `
      <body style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto;">
        <h2>Payment Successful</h2>
        <p>Your payment for <strong>${productName}</strong> has been confirmed.</p>
        <p><strong>Amount:</strong> $${price}</p>
      </body>
    `,
  });
}

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
}

async function createPaymentAndSendEmail({ product, userEmail }) {
  validatePaymentInput(product, userEmail);
  const stripePriceId = await getOrCreateStripePrice(product);
  const paymentUrl = await createPaymentLink(stripePriceId, userEmail, product.name);
  await sendPaymentLinkEmail(userEmail, paymentUrl, product.name, product.price);
  return { paymentUrl };
}

function constructWebhookEvent(reqBody, stripeSignature) {
  if (!WEBHOOK_SECRET) {
    throw new Error("WEBHOOK_SECRET is required.");
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(reqBody, stripeSignature, WEBHOOK_SECRET);
}

module.exports = {
  createPaymentAndSendEmail,
  constructWebhookEvent,
  saveOrder,
  sendSuccessEmail,
};
