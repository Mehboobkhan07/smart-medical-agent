#!/bin/bash
echo "🏥 Starting Smart Medical AI Agent..."

# Start Backend
echo "Starting Backend on port 8000..."
cd backend
python -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -r requirements.txt -q
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start Frontend
echo "Starting Frontend on port 3000..."
cd ../frontend
npm install -q
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ Backend:  http://localhost:8000"
echo "✅ Frontend: http://localhost:3000"
echo "✅ API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"

wait
