# 🚀 AI Voice Agent SaaS — Backend

A production-ready backend for an AI-powered Voice Agent SaaS platform that enables real-time phone calls, intelligent responses using RAG, and AI-driven conversations.

---

## 📌 Features

### 🔐 Authentication

* JWT-based authentication
* Protected routes
* Secure user handling

---

### ☎️ Twilio Integration

* Connect Twilio account
* Verify credentials before saving
* Store Twilio configuration per user

---

### 📞 Voice Calling

* ✅ Inbound calls (Twilio webhook)
* ✅ Outbound calls (dynamic API)
* AI voice response support

---

### 🤖 AI Agent System

* Create AI agents
* Custom system prompts
* Personalized greetings

---

### 📄 Knowledge Base (RAG)

* Upload PDFs
* Extract text using `pdf-parse`
* Chunk-based search
* Context-aware answers

---

### 🧠 AI Integration

* Gemini 2.5 Flash Lite
* Retrieval Augmented Generation (RAG)

---

## 🧱 Tech Stack

* Node.js
* Express.js
* MongoDB
* Twilio
* Gemini AI
* LiveKit (in progress)

---

## ⚙️ Setup Instructions

### 1. Clone repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-voice-agent-backend.git
cd ai-voice-agent-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file

```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret
GEMINI_API_KEY=your_api_key
```

### 4. Run server

```bash
npm run dev
```

### Debug with saved logs

```bash
npm run start:debug
```

This writes fresh runtime logs to:

* `backend_out.log`
* `worker_out.log`

---

## 🔗 API Endpoints

### 👤 Auth

* POST `/api/users/register`
* POST `/api/users/login`

---

### ☎️ Twilio

* POST `/api/users/connect-twilio`
* POST `/api/users/call`

---

### 🤖 Agents

* POST `/api/agents`
* GET `/api/agents`

---

## 📞 Example: Make Call

### Request

```json
{
  "to": "+919XXXXXXXXX"
}
```
🌐 Ngrok Setup (IMPORTANT)

Twilio requires a public URL, so we use ngrok.

Install Ngrok

https://ngrok.com/download

Add Auth Token
ngrok config add-authtoken YOUR_TOKEN
Start Ngrok
ngrok http 5000
Example Output
https://abc123.ngrok-free.dev -> http://localhost:5000
Twilio Webhook Setup

Go to Twilio Console → Phone Numbers → Voice

Set:

https://abc123.ngrok-free.dev/api/twilio/voice

Method:

POST
🎤 Twilio Voice Webhook Example
app.post("/api/twilio/voice", (req, res) => {
  res.set("Content-Type", "text/xml");

  res.send(`
    <Response>
      <Say>Hello from AI Voice Agent 🚀</Say>
    </Response>
  `);
});
🔄 System Flow
User → Backend API → MongoDB
                    ↓
                Knowledge Base
                    ↓
                Gemini AI (RAG)
                    ↓
                Response

Call Flow:
User → Backend → Twilio → Webhook (ngrok) → Backend → Voice Response
---

## 🧠 System Architecture

```text
User → Backend → Twilio → Phone Call
                ↓
            Gemini AI (RAG)
                ↓
            Response
```

---

## 🎯 Future Improvements

* 🎙️ Real-time AI voice (LiveKit)
* 💳 Stripe payments
* 📧 Email notifications
* 🧠 Tool-based AI actions

---

## 🚀 Author

Satyam Kumar

# 💳 Stripe Payment System — stripe.js

Handles the full payment flow:
- Creates Stripe products & payment links automatically
- Sends **Email 1** (payment link) before payment
- Sends **Email 2** (success confirmation) after payment
- Saves completed orders to MongoDB

---

## 📁 File Location

```
ai-voice-agent-backend/          ← project root
    .env                         ← your secret keys go here
    src/
        utils/
            payment/
                stripe.js        ← this file
```

---

## 📦 STEP 1 — Install Dependencies

Run from your **project root folder:**

```bash
cd C:\Users\aakas\OneDrive\Desktop\ddvs\ai-voice-agent-backend
npm install stripe nodemailer mongoose express dotenv
```

---

## 🔑 STEP 2 — Create .env File

Create a `.env` file in your **project root** (same level as `package.json`):

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxx
MONGO_URL=mongodb://localhost:27017/shopdb
GMAIL_USER=your@gmail.com
GMAIL_PASSWORD=abcdefghijklmnop
SUCCESS_URL=http://localhost:3000/success
```

> ⚠️ No quotes around values. No spaces around `=`

---

## 🔑 STEP 3 — Get Stripe Secret Key

1. Go to **[dashboard.stripe.com](https://dashboard.stripe.com)**
2. Make sure **Test Mode** is ON (toggle top right)
3. Click **Developers** → **API Keys**
4. Copy **Secret key** → paste as `STRIPE_SECRET_KEY` in `.env`

---

## 📧 STEP 4 — Get Gmail App Password

> You cannot use your normal Gmail password in code. Google blocks it.

1. Go to **[myaccount.google.com](https://myaccount.google.com)**
2. **Security** → Turn ON **2-Step Verification**
3. Search **App Passwords** → type `NodeMailer` → click **Create**
4. Copy the 16-digit password Google shows you
5. Paste as `GMAIL_PASSWORD` in `.env` **(remove spaces)**

```env
GMAIL_PASSWORD=abcdefghijklmnop   ✅ correct (no spaces)
GMAIL_PASSWORD=abcd efgh ijkl mnop  ❌ wrong (has spaces)
```

---

## 🍃 STEP 5 — Setup MongoDB

**Option A — Local MongoDB:**
```bash
# Make sure MongoDB is running
mongod
```
```env
MONGO_URL=mongodb://localhost:27017/shopdb
```

**Option B — MongoDB Atlas (Cloud):**
1. Go to **[cloud.mongodb.com](https://cloud.mongodb.com)** → create free cluster
2. Click **Connect** → **Drivers** → copy connection string
```env
MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/shopdb
```

---

## 🌐 STEP 6 — Setup ngrok (Public URL for Webhook)

Stripe needs a public HTTPS URL to send webhook events to your local server.

**Install ngrok:**
```bash
npm install -g ngrok
```

**Create free account at [ngrok.com](https://ngrok.com) → copy your auth token:**
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

**Start ngrok** (after your server is running):
```bash
ngrok http 3000
```

It prints:
```
Forwarding  https://abc123.ngrok-free.app → http://localhost:3000
```
Copy that URL — you need it in the next step.

---

## 🪝 STEP 7 — Setup Stripe Webhook

1. Go to **[dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)**
2. Click **Add Endpoint**
3. Fill in:
   - **Endpoint URL:** `https://abc123.ngrok-free.app/stripe/webhook`
   - **Payload style:** Snapshot
   - **Events:** select `checkout.session.completed`
4. Click **Create**
5. Click **Reveal** next to **Signing Secret** → copy `whsec_xxx`
6. Paste as `WEBHOOK_SECRET` in `.env`

---

## ⚙️ STEP 8 — Check package.json Has type module

Open root `package.json` and make sure this line exists:

```json
{
  "name": "ai-voice-agent-backend",
  "type": "module",
  ...
}
```

---

## 🚀 STEP 9 — Run the Server

Open **2 terminals:**

**Terminal 1 — Start server:**
```bash
cd C:\Users\aakas\OneDrive\Desktop\ddvs\ai-voice-agent-backend
node src/utils/payment/stripe.js
```

Expected output:
```
✅ MongoDB connected
🚀 Server running on http://localhost:3000
```

**Terminal 2 — Start ngrok:**
```bash
ngrok http 3000
```

---

## 🧪 STEP 10 — Test Using Postman

1. Open Postman → new request
2. Set:
   - **Method:** `POST`
   - **URL:** `http://localhost:3000/stripe/create-payment`
3. Click **Body** → **raw** → **JSON**
4. Paste:

```json
{
  "product": {
    "product_id": "P001",
    "name": "Pro Laptop",
    "price": 999,
    "description": "High performance laptop"
  },
  "userEmail": "your@gmail.com"
}
```

5. Click **Send**

**Expected response:**
```json
{
  "success": true,
  "paymentUrl": "https://buy.stripe.com/xxx"
}
```

**Expected server logs:**
```
🛒 your@gmail.com wants to buy: Pro Laptop
✅ Created on Stripe: Pro Laptop → price_xxx
✅ Payment link created: https://buy.stripe.com/xxx
✅ Payment link email sent to your@gmail.com
```

---

## 📧 Email 1 — Payment Link Email

Sent immediately after calling `/stripe/create-payment`

```
Subject: Your Payment Link - Pro Laptop

Your Order is Ready! 🛍️
Price: $999
[ Pay Now → ]  ← Stripe payment link
```

---

## 💳 STEP 11 — Complete Test Payment

1. Check your Gmail inbox (check **Spam** too)
2. Open email → click **Pay Now**
3. Use Stripe test card:

```
Card Number:  4242 4242 4242 4242
Expiry:       12/26
CVC:          123
Name:         Any name
```

4. Click **Pay**

**Expected server logs after payment:**
```
📥 Webhook received: checkout.session.completed
💰 Payment successful: your@gmail.com paid for Pro Laptop
✅ Order saved in MongoDB
✅ Success confirmation email sent to your@gmail.com
```

---

## 📧 Email 2 — Success Confirmation Email

Sent automatically after payment is completed via webhook

```
Subject: ✅ Payment Confirmed - Pro Laptop

✅ Payment Successful!

Product:      Pro Laptop
Amount Paid:  $999.00
Status:       ✅ Confirmed

Thank you for your purchase! 🎉
```

---

## 🗄️ STEP 12 — Check Orders in MongoDB

**Via MongoDB shell:**
```bash
mongosh
use shopdb
db.orders.find().pretty()
```

**Via API:**
```
GET http://localhost:3000/orders/your@gmail.com
```

---

## 📌 API Endpoints

| Method | Endpoint | Description | Called By |
|--------|----------|-------------|-----------|
| `POST` | `/stripe/create-payment` | Creates payment link + sends Email 1 | Your agent |
| `POST` | `/stripe/webhook` | Receives payment confirmation from Stripe | Stripe |
| `GET` | `/orders/:email` | Get all orders for a user | Your app |
| `GET` | `/success` | Redirect page after payment | Browser |

---

## 🔄 Full Flow

```
1. Agent finds product from PDF
          ↓
2. POST /stripe/create-payment
          ↓
3. Product created on Stripe (if not exists)
          ↓
4. Payment link generated
          ↓
5. 📧 Email 1 sent → "Your Payment Link - Pro Laptop"
          ↓
6. User clicks Pay Now → enters card → pays
          ↓
7. Stripe fires webhook → POST /stripe/webhook
          ↓
8. Order saved to MongoDB
          ↓
9. 📧 Email 2 sent → "✅ Payment Confirmed - Pro Laptop"
```

---

## ❌ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `uri must be a string got undefined` | `.env` file not found | Check `.env` is in root folder, check path in `dotenv.config()` |
| `Cannot find package 'stripe'` | Packages not installed | Run `npm install` from project root |
| `Invalid webhook signature` | Wrong `WEBHOOK_SECRET` | Copy the exact `whsec_xxx` from Stripe Dashboard |
| `Invalid login` (email error) | Wrong Gmail password | Use App Password (16 digits), not your Gmail password |
| `Authentication failed` (email) | App Password has spaces | Remove spaces from App Password in `.env` |
| Email goes to spam | Gmail filters | Check spam folder, or use a different Gmail |
| ngrok URL not working | ngrok not running | Start ngrok with `ngrok http 3000` |

---

## ⚠️ Important Notes

1. **Never commit `.env` to GitHub** — add `.env` to `.gitignore`
2. **ngrok URL changes** every restart — update Stripe webhook URL each time
3. **Keep both terminals running** — server + ngrok while testing
4. **Rotate Stripe key** if accidentally pushed to GitHub
5. **Switch to live keys** (`sk_live_xxx`) when going to production
