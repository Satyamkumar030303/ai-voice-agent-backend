# 🚀 AI Voice Agent SaaS — Backend

![Node](https://img.shields.io/badge/Node.js-18+-green)
![Docker](https://img.shields.io/badge/Docker-ready-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

A **production-ready backend** for an **AI-powered Voice Agent SaaS platform** that enables real-time phone calls, intelligent responses using **Retrieval-Augmented Generation (RAG)**, and **AI-driven voice conversations**.

---

# 📌 Features

## 🔐 Authentication

* JWT-based authentication
* Protected API routes
* Secure user session handling

---

## ☎️ Twilio Integration

* Connect Twilio account
* Verify credentials before saving
* Store Twilio configuration per user

---

## 📞 Voice Calling

* ✅ Inbound calls via Twilio webhook
* ✅ Outbound calls via API
* AI-generated voice responses

---

## 🤖 AI Agent System

* Create multiple AI agents
* Custom system prompts
* Personalized greetings
* Agent-specific configuration

---

## 📄 Knowledge Base (RAG)

* Upload PDF documents
* Extract text using `pdf-parse`
* Chunk-based semantic retrieval
* Context-aware AI answers

---

## 🧠 AI Integration

* Gemini 2.5 Flash Lite
* Retrieval Augmented Generation (RAG)

---

# 🧱 Tech Stack

Backend technologies used:

* **Node.js**
* **Express.js**
* **MongoDB**
* **Twilio**
* **Gemini AI**
* **LiveKit (planned)**

---

# ⚙️ Local Setup Instructions

## 1️⃣ Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-voice-agent-backend.git
cd ai-voice-agent-backend
```

---

## 2️⃣ Install Dependencies

```bash
npm install
```

---

## 3️⃣ Create `.env` File

Create a `.env` file in the root directory.

Example:

```env
PORT=5000

MONGO_URI=mongodb://localhost:27017/ai-voice-agent
JWT_SECRET=your_jwt_secret

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Email
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
```

---

## 4️⃣ Run Development Server

```bash
npm run dev
```

Backend will run at:

```
http://localhost:5000
```

---

# 🐳 Run with Docker (Recommended)

Instead of installing dependencies manually, you can run the backend using **Docker**.

## Prerequisites

* Docker Desktop installed
* MongoDB running locally or MongoDB Atlas

---

## Run Backend Container

From the project root:

```bash
docker compose up --build
```

Docker will:

* Build the backend container
* Install dependencies
* Start the Node server

---

# 🔗 API Endpoints

## 👤 Authentication

| Method | Endpoint              |
| ------ | --------------------- |
| POST   | `/api/users/register` |
| POST   | `/api/users/login`    |

---

## ☎️ Twilio

| Method | Endpoint                    |
| ------ | --------------------------- |
| POST   | `/api/users/connect-twilio` |
| POST   | `/api/users/call`           |

---

## 🤖 Agents

| Method | Endpoint      |
| ------ | ------------- |
| POST   | `/api/agents` |
| GET    | `/api/agents` |

---

# 📞 Example: Make Call

### Request

```json
{
  "to": "+919XXXXXXXXX"
}
```

---

# 🌐 Ngrok Setup (IMPORTANT)

Twilio requires a **public URL**, so we use **ngrok**.

---

## Install Ngrok

Download from:

[https://ngrok.com/download](https://ngrok.com/download)

---

## Add Auth Token

```bash
ngrok config add-authtoken YOUR_TOKEN
```

---

## Start Ngrok

```bash
ngrok http 5000
```

Example output:

```
https://abc123.ngrok-free.dev -> http://localhost:5000
```

---

## Twilio Webhook Setup

Go to:

```
Twilio Console → Phone Numbers → Voice
```

Set webhook:

```
https://abc123.ngrok-free.dev/api/twilio/voice
```

Method:

```
POST
```

---

# 🎤 Twilio Voice Webhook Example

```javascript
app.post("/api/twilio/voice", (req, res) => {
  res.set("Content-Type", "text/xml");

  res.send(`
    <Response>
      <Say>Hello from AI Voice Agent 🚀</Say>
    </Response>
  `);
});
```

---

# 🔄 System Flow

```
User → Backend API → MongoDB
                    ↓
                Knowledge Base
                    ↓
                Gemini AI (RAG)
                    ↓
                Response
```

---

# 📞 Call Flow

```
User
 ↓
Twilio Phone Number
 ↓
Backend Webhook
 ↓
Gemini AI (RAG)
 ↓
Voice Response
```

---

# 🧠 System Architecture

```
User → Backend → Twilio → Phone Call
                ↓
            Gemini AI (RAG)
                ↓
            Response
```

---

# 🐳 Docker Architecture

The system runs inside **multiple containers**.

```
User Browser
      ↓
Frontend Container (React + Vite) → Port 5173
      ↓
Backend Container (Node + Express) → Port 5000
      ↓
MongoDB
```

Containers are orchestrated using **Docker Compose**.

---

# 🐳 Running the Full System with Docker

The frontend and backend exist in **separate repositories**, but they can run together using **Docker Compose**.

Example project structure:

```
ai-voice-saas
├── backend
├── frontend
└── docker-compose.yml
```

---

## Example docker-compose.yml

```yaml
services:

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    env_file:
      - ./backend/.env

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

---

## Run the Full System

Clone both repositories:

```bash
git clone <backend_repo>
git clone <frontend_repo>
```

Project structure:

```
ai-voice-saas/
backend/
frontend/
docker-compose.yml
```

Run the system:

```bash
docker compose up --build
```

---

## Access Application

Frontend:

```
http://localhost:5173
```

Backend API:

```
http://localhost:5000
```

---

# 🎯 Future Improvements

* 🎙️ Real-time AI voice (LiveKit)
* 💳 Stripe payments
* 🧠 Tool-based AI actions

---

