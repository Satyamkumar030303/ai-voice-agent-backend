const Product = require("../../models/Product");
const Order = require("../../models/Order");
const SessionEmail = require("../../models/sessionEmail");
const { ensureMongoConnection } = require("../../services/knowledgeBaseService");

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

function validateEnv() {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is required.");
  }

  if (!GMAIL_USER || !GMAIL_PASSWORD) {
    throw new Error("GMAIL_USER and GMAIL_PASSWORD are required.");
  }
}

function normalizeProductShape(product) {
  if (
    !product ||
    !product.productId ||
    !product.name ||
    !Number.isFinite(product.price)
  ) {
    throw new Error("Resolved product must include productId, name and price.");
  }

  return {
    product_id: product.productId,
    name: product.name,
    description: product.description || "",
    price: product.price,
    currency: (product.currency || "usd").toLowerCase(),
  };
}

async function resolveProduct({ product, productId, userId }) {
  await ensureMongoConnection();

  if (product) {
    return normalizeProductShape({
      productId: product.product_id || product.productId,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      currency: product.currency || "usd",
    });
  }

  if (!productId) {
    throw new Error("productId is required when product details are not provided.");
  }

  const query = userId ? { user: userId, productId } : { productId };
  const storedProduct = await Product.findOne(query).lean();

  if (!storedProduct) {
    throw new Error(`Product not found for productId: ${productId}`);
  }

  return normalizeProductShape(storedProduct);
}

async function getSessionNameFallback(sessionKey) {
  if (!sessionKey) {
    return null;
  }

  const session = await SessionEmail.findOne({ sessionKey }).lean();
  return session?.name || null;
}

async function findReusablePendingOrder({ sessionKey, userEmail, productId }) {
  if (!userEmail || !productId) {
    return null;
  }

  await ensureMongoConnection();
  return Order.findOne({
    sessionKey: sessionKey || null,
    userEmail,
    productId,
    status: "payment_link_sent",
    paymentUrl: { $ne: null },
  })
    .sort({ updatedAt: -1 })
    .lean();
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
    currency: product.currency || "usd",
  });

  return stripePrice.id;
}

async function createPaymentLink({ stripePriceId, userEmail, userName, product, sessionKey }) {
  const stripe = getStripeClient();
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: stripePriceId, quantity: 1 }],
    after_completion: {
      type: "redirect",
      redirect: { url: SUCCESS_URL },
    },
    metadata: {
      user_email: userEmail,
      user_name: userName || "",
      product_id: product.product_id,
      product_name: product.name,
      session_key: sessionKey || "",
    },
  });

  return paymentLink.url;
}

async function sendPaymentLinkEmail(userEmail, paymentUrl, productName, price) {
  console.log(
    `[Payment] Sending payment link email for ${productName} to ${userEmail}.`
  );
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

async function savePendingOrder({ sessionKey, userEmail, userName, product, paymentUrl }) {
  await ensureMongoConnection();
  return Order.findOneAndUpdate(
    { sessionKey: sessionKey || null, userEmail, productId: product.product_id, status: { $ne: "completed" } },
    {
      sessionKey: sessionKey || null,
      userName: userName || null,
      userEmail,
      productId: product.product_id,
      productName: product.name,
      amount: Number(product.price),
      currency: product.currency || "usd",
      status: "payment_link_sent",
      paymentUrl,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function saveFailedOrder({ sessionKey, userEmail, userName, product, errorMessage }) {
  await ensureMongoConnection();

  return Order.findOneAndUpdate(
    {
      sessionKey: sessionKey || null,
      userEmail,
      productId: product.product_id,
      status: { $ne: "completed" },
    },
    {
      sessionKey: sessionKey || null,
      userName: userName || null,
      userEmail,
      productId: product.product_id,
      productName: product.name,
      amount: Number(product.price),
      currency: product.currency || "usd",
      status: "failed",
      paymentUrl: null,
      stripePaymentIntent: errorMessage || null,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function saveOrder({
  userEmail,
  productId,
  productName,
  amount,
  sessionId,
  paymentIntent,
  sessionKey = null,
  userName = null,
}) {
  await ensureMongoConnection();

  return Order.findOneAndUpdate(
    {
      $or: [
        { stripeSessionId: sessionId },
        { sessionKey, userEmail, productId },
      ],
    },
    {
      sessionKey,
      userName,
      userEmail,
      productId,
      productName,
      amount: Number(amount) / 100,
      currency: "usd",
      stripeSessionId: sessionId,
      stripePaymentIntent: paymentIntent,
      status: "completed",
      purchasedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function createPaymentAndSendEmail({
  product,
  productId,
  userId,
  userEmail,
  userName = null,
  sessionKey = null,
}) {
  if (!userEmail) {
    throw new Error("userEmail is required");
  }

  validateEnv();
  const resolvedProduct = await resolveProduct({ product, productId, userId });
  const resolvedUserName = userName || (await getSessionNameFallback(sessionKey));
  console.log(
    `[Payment] Resolved product ${resolvedProduct.product_id} for ${userEmail}.`
  );

  const existingPendingOrder = await findReusablePendingOrder({
    sessionKey,
    userEmail,
    productId: resolvedProduct.product_id,
  });

  if (existingPendingOrder?.paymentUrl) {
    console.log(
      `[Payment] Reusing existing payment link for ${resolvedProduct.product_id} and ${userEmail}.`
    );
    return {
      paymentUrl: existingPendingOrder.paymentUrl,
      product: resolvedProduct,
      userName: resolvedUserName,
      reusedExistingLink: true,
    };
  }

  const stripePriceId = await getOrCreateStripePrice(resolvedProduct);
  console.log(
    `[Payment] Stripe price ready for ${resolvedProduct.product_id}: ${stripePriceId}`
  );
  const paymentUrl = await createPaymentLink({
    stripePriceId,
    userEmail,
    userName: resolvedUserName,
    product: resolvedProduct,
    sessionKey,
  });
  console.log(
    `[Payment] Created payment link for ${resolvedProduct.product_id}: ${paymentUrl}`
  );

  try {
    await sendPaymentLinkEmail(
      userEmail,
      paymentUrl,
      resolvedProduct.name,
      resolvedProduct.price
    );
    console.log(
      `[Payment] Email delivery reported success for ${resolvedProduct.product_id} to ${userEmail}.`
    );
  } catch (error) {
    console.error(
      `[Payment] Failed to send payment email for ${resolvedProduct.product_id} to ${userEmail}:`,
      error.message
    );
    await saveFailedOrder({
      sessionKey,
      userEmail,
      userName: resolvedUserName,
      product: resolvedProduct,
      errorMessage: error.message,
    });
    throw new Error(
      `Payment link was created but the email could not be sent: ${error.message}`
    );
  }

  await savePendingOrder({
    sessionKey,
    userEmail,
    userName: resolvedUserName,
    product: resolvedProduct,
    paymentUrl,
  });

  return {
    paymentUrl,
    product: resolvedProduct,
    userName: resolvedUserName,
    reusedExistingLink: false,
  };
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
