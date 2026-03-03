@echo off
echo Starting Smart Medical AI Agent...

echo Starting Backend...
cd backend
start cmd /k "python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

echo Starting Frontend...
cd ../frontend
start cmd /k "npm install && npm start"

echo Both servers starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
