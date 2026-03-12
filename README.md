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

## stripe payemnt
# 🛍️ Stripe Payment Agent — Setup & Run Guide

A complete payment system that:
- Creates Stripe payment links for products
- Sends payment links to users via email
- Saves completed orders to MongoDB after payment

---

## 📁 Project Structure

```
your-project/
    src/
        utils/
            payment/
                ProductPaymentAndEmail.js   ← main file
    package.json
```

---

## ✅ Prerequisites

Make sure you have these installed:
- **Node.js** v18 or higher → [nodejs.org](https://nodejs.org)
- **MongoDB** running locally OR a MongoDB Atlas account
- **Gmail** account with App Password enabled
- **Stripe** account (free) → [stripe.com](https://stripe.com)
- **ngrok** account (free) → [ngrok.com](https://ngrok.com)

---

## 🔧 STEP 1 — Install Dependencies

Go to your project **root folder** (not inside the payment folder):

```bash
cd C:\Users\aakas\OneDrive\Desktop\ddvs\ai-voice-agent-backend
```

Install required packages:

```bash
npm install stripe nodemailer mongoose express
```

Also make sure your root `package.json` has `"type": "module"`:

```json
{
  "name": "ai-voice-agent-backend",
  "type": "module",
  "dependencies": {
    ...
  }
}
```

---

## 🔑 STEP 2 — Get Your Stripe Secret Key

1. Go to **[dashboard.stripe.com](https://dashboard.stripe.com)**
2. Make sure **Test Mode** is ON (toggle top right)
3. Click **Developers** → **API Keys**
4. Copy **Secret key** — looks like `sk_test_xxxxxxxxxxxxxxxx`

Paste it in `ProductPaymentAndEmail.js`:

```js
const STRIPE_SECRET_KEY = "sk_test_xxxxxxxxxxxxxxxx";
```

---

## 📧 STEP 3 — Get Gmail App Password

> You need this so your code can send emails. You CANNOT use your normal Gmail password.

1. Go to **[myaccount.google.com](https://myaccount.google.com)**
2. Click **Security** → Turn ON **2-Step Verification**
3. Go back to **Security** → search **App Passwords**
4. Type `NodeMailer` → Click **Create**
5. Google gives you a 16-digit password like: `abcd efgh ijkl mnop`
6. Copy it **(Google shows it only once!)**

Paste it in your code **(remove spaces)**:

```js
const GMAIL_USER     = "your@gmail.com";
const GMAIL_PASSWORD = "abcdefghijklmnop";  // 16 digits, no spaces
```

---

## 🍃 STEP 4 — Setup MongoDB

**Option A — Local MongoDB:**

Make sure MongoDB is installed and running:

```bash
mongod
```

Use this URL in your code:

```js
const MONGO_URL = "mongodb://localhost:27017/shopdb";
```

**Option B — MongoDB Atlas (Cloud):**

1. Go to **[cloud.mongodb.com](https://cloud.mongodb.com)** → create free cluster
2. Click **Connect** → **Drivers** → copy connection string
3. Paste in your code:

```js
const MONGO_URL = "mongodb+srv://user:password@cluster.mongodb.net/shopdb";
```

---

## 🌐 STEP 5 — Setup ngrok (Public URL for Webhook)

ngrok gives your local server a public HTTPS URL so Stripe can send webhook events to it.

**Install ngrok:**

```bash
npm install -g ngrok
```

**Create free account at [ngrok.com](https://ngrok.com) then add your auth token:**

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

---

## 🪝 STEP 6 — Setup Stripe Webhook

**Start your server first (Terminal 1):**

```bash
node src/utils/payment/ProductPaymentAndEmail.js
```

**Start ngrok (Terminal 2):**

```bash
ngrok http 3000
```

ngrok prints a URL like:

```
Forwarding  https://abc123.ngrok-free.app → http://localhost:3000
```

**Now go to Stripe Dashboard:**

1. Go to **[dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)**
2. Click **Add Endpoint** (or **Add Destination**)
3. Fill in:
   - **Endpoint URL:** `https://abc123.ngrok-free.app/stripe/webhook`
   - **Events:** select `checkout.session.completed`
   - **Payload style:** Snapshot
4. Click **Create**
5. On the detail page → click **Reveal** next to **Signing Secret**
6. Copy `whsec_xxxxxxxxxxxxxxxx`

Paste it in your code:

```js
const WEBHOOK_SECRET = "whsec_xxxxxxxxxxxxxxxx";
```

---

## ⚙️ STEP 7 — Final Config in Your File

Open `ProductPaymentAndEmail.js` and fill in all values:

```js
const STRIPE_SECRET_KEY = "sk_test_xxxxxxxxxxxxxxxx";   // Step 2
const WEBHOOK_SECRET    = "whsec_xxxxxxxxxxxxxxxx";     // Step 6
const MONGO_URL         = "mongodb://localhost:27017/shopdb"; // Step 4
const GMAIL_USER        = "your@gmail.com";             // Step 3
const GMAIL_PASSWORD    = "abcdefghijklmnop";           // Step 3
const SUCCESS_URL       = "http://localhost:3000/success";
```

---

## 🚀 STEP 8 — Run the Project

Open **3 terminals:**

**Terminal 1 — Start Server:**

```bash
cd C:\Users\aakas\OneDrive\Desktop\ddvs\ai-voice-agent-backend
node src/utils/payment/ProductPaymentAndEmail.js
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

**Terminal 3 — Keep open for testing**

---

## 🧪 STEP 9 — Test Using Postman

1. Open **Postman**
2. Create new request:
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

**Expected Response:**

```json
{
  "success": true,
  "paymentUrl": "https://buy.stripe.com/xxx"
}
```

**Expected Server Logs:**

```
🛒 your@gmail.com wants to buy: Pro Laptop
✅ Created on Stripe: Pro Laptop → price_xxx
✅ Email sent to your@gmail.com
```

---

## 💳 STEP 10 — Complete a Test Payment

1. Check your Gmail inbox (also check **Spam** folder)
2. Open the email → click **Pay Now**
3. On Stripe checkout page use test card:

```
Card Number:  4242 4242 4242 4242
Expiry:       12/26  (any future date)
CVC:          123    (any 3 digits)
Name:         Any name
```

4. Click **Pay**

**Expected after payment:**

```
Server logs:
📥 Webhook received: checkout.session.completed
💰 Payment successful: your@gmail.com paid for Pro Laptop
✅ Order saved in MongoDB
```

---

## 🗄️ STEP 11 — Check Orders in MongoDB

```bash
mongosh

use shopdb
db.orders.find().pretty()
```

Or via API:

```
GET http://localhost:3000/orders/your@gmail.com
```

---

## 📌 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/stripe/create-payment` | Your agent calls this after finding product |
| `POST` | `/stripe/webhook` | Stripe calls this after payment |
| `GET`  | `/orders/:email` | Get all orders for a user |
| `GET`  | `/success` | Redirect page after payment |

---

## ❌ Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `Cannot find package 'stripe'` | Run `npm install` from project **root** folder |
| `Invalid login` (email) | Use Gmail App Password, not your Gmail password |
| `Invalid webhook signature` | Make sure ngrok is running and webhook URL is correct |
| `MongoDB connection failed` | Make sure `mongod` is running or Atlas URL is correct |
| Email in spam | Check spam folder, or use a different Gmail account |
| ngrok URL changed | Update webhook URL on Stripe Dashboard and restart |

---

## ⚠️ Important Notes

1. **ngrok URL changes** every time you restart it — update Stripe webhook URL each time
2. **Keep all 3 terminals running** while testing
3. **Webhook secret changes** if you delete and recreate the webhook on Stripe
4. **Test mode** — use `sk_test_xxx` keys and test card `4242 4242 4242 4242` while developing
5. **Go live** — swap `sk_test_xxx` → `sk_live_xxx` when ready for production 