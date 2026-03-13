const mongoose = require("mongoose");
const {
  createPaymentAndSendEmail,
  constructWebhookEvent,
  saveOrder,
  sendSuccessEmail,
} = require("./paymentService");

const paymentController = {
  async createpayment(req, res) {
    const { product, userEmail } = req.body || {};

    try {
      const result = await createPaymentAndSendEmail({ product, userEmail });
      return res.json({ success: true, paymentUrl: result.paymentUrl });
    } catch (error) {
      console.error("Payment create error:", error.message);
      return res.status(500).json({ error: error.message });
    }
  },

  async createpaymentbytool(product, userEmail) {
    return createPaymentAndSendEmail({ product, userEmail });
  },

  async handleWebhook(req, res) {
    let event;

    try {
      event = constructWebhookEvent(req.body, req.headers["stripe-signature"]);
    } catch (error) {
      console.error("Invalid Stripe webhook signature:", error.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userEmail = session.metadata?.user_email;
      const productName = session.metadata?.product_name;
      const amount = session.amount_total;
      const sessionId = session.id;
      const paymentIntent = session.payment_intent;

      if (!userEmail || !productName) {
        return res.status(400).json({ error: "Missing metadata" });
      }

      try {
        await saveOrder(userEmail, null, productName, amount, sessionId, paymentIntent);
      } catch (error) {
        console.error("Order save failed:", error.message);
      }

      try {
        await sendSuccessEmail(userEmail, productName, amount);
      } catch (error) {
        console.error("Success email failed:", error.message);
      }
    }

    return res.json({ received: true });
  },

  async findorders(req, res) {
    try {
      const Order = mongoose.models.Order;
      const orders = await Order.find({ user_email: req.params.email }).sort({ created_at: -1 });
      return res.json({ orders });
    } catch (error) {
      console.error("Failed to fetch orders:", error.message);
      return res.status(500).json({ error: "Failed to fetch orders" });
    }
  },
};

module.exports = paymentController;
