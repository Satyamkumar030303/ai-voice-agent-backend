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

