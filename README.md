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

