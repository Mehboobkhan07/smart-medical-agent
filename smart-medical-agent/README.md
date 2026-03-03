# 🏥 Smart Medical AI Agent System

> An Agentic AI-powered Healthcare Management System built with LangGraph, LangChain, Groq LLaMA 3.3-70B, FastAPI & React

![Tech Stack](https://img.shields.io/badge/AI-LangGraph%20%2B%20LangChain-blue)
![LLM](https://img.shields.io/badge/LLM-Groq%20LLaMA%203.3--70B-green)
![Backend](https://img.shields.io/badge/Backend-FastAPI-orange)
![Frontend](https://img.shields.io/badge/Frontend-React%2018-cyan)

---

## 🌟 Features

### 🤖 AI Agent Capabilities
- **Multi-Agent Architecture** using LangGraph state machines
- **Conversational Medical Assistant** — ask anything about patients, drugs, inventory
- **Drug Interaction Checker** — automatic safety validation on all prescriptions
- **Inventory Intelligence** — real-time low stock alerts and analysis
- **Appointment Scheduler Agent** — natural language scheduling
- **Symptom Analyzer** — non-diagnostic symptom guidance

### 📊 Dashboard & Management
- Real-time analytics dashboard with charts
- Patient records management (CRUD)
- AI-validated prescription system
- Medicine inventory with stock tracking
- Appointment scheduling with daily view

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| LLM | Groq API — LLaMA 3.3-70B-Versatile |
| Agent Framework | LangGraph (State Machine) + LangChain |
| Backend | FastAPI + Python |
| Frontend | React 18 + Recharts |
| Styling | Custom CSS (Dark Medical Theme) |

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Groq API Key (free at [console.groq.com](https://console.groq.com))

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/smart-medical-agent.git
cd smart-medical-agent
```

### 2. Setup Backend
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate       # Mac/Linux
# OR
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Add your Groq API key
# Edit .env file:
# GROQ_API_KEY=your_groq_api_key_here

# Start backend
uvicorn main:app --reload --port 8000
```

### 3. Setup Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm start
```

### 4. Open the app
- Frontend: http://localhost:3000
- Backend API Docs: http://localhost:8000/docs

---

## 🔑 Getting Your Groq API Key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free)
3. Navigate to API Keys → Create API Key
4. Copy and paste into `backend/.env`

---

## 🧠 Architecture

```
User Input
    │
    ▼
LangGraph State Machine
    │
    ├── Agent Node (Groq LLaMA 3.3-70B)
    │       │
    │       ├── Tool: get_patient_info
    │       ├── Tool: check_drug_interaction
    │       ├── Tool: get_medicine_info
    │       ├── Tool: check_inventory
    │       ├── Tool: schedule_appointment
    │       └── Tool: get_symptom_analysis
    │
    └── Tool Execution Node
            │
            ▼
        Response to User
```

---

## 📸 Pages

| Page | Description |
|------|-------------|
| Dashboard | Analytics, charts, alerts |
| AI Assistant | Multi-agent chat interface |
| Patients | Patient records management |
| Prescriptions | AI-validated prescription system |
| Inventory | Stock management with alerts |
| Appointments | Scheduling & calendar view |

---

## 📦 What to Install

### Python Libraries
```
fastapi, uvicorn, pydantic
langchain, langchain-groq, langgraph, langchain-core
python-dotenv, httpx
```

### Node Packages
```
react, react-dom, react-router-dom
recharts, lucide-react, axios
framer-motion, react-markdown
```

---

## 🤝 Contributing
Pull requests are welcome!

---

## 📄 License
MIT
