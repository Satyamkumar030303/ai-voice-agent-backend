import express from "express";
import paymentController from "./paymentController.js";

const router = express.Router();

router.post("/stripe/create-payment", paymentController.createpayment);
// router.post("/stripe/create-payment/tool", paymentController.createpaymentbytool);

router.get("/orders/:email", paymentController.findorders);

router.get("/success", (req, res) => {
  res.send("<h1>✅ Payment Successful! Thank you for your purchase.</h1>");
});

export default router;


// app.listen(3000, () => {
//   console.log("\n🚀 Server running on http://localhost:3000");
//   console.log("─────────────────────────────────────────────────────");
//   console.log("POST /stripe/create-payment  → agent calls this");
//   console.log("POST /stripe/webhook         → Stripe calls after payment");
//   console.log("GET  /orders/:email          → get orders for a user");
//   console.log("GET  /success                → redirect page after payment");
//   console.log("─────────────────────────────────────────────────────");
// });