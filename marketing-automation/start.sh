#!/bin/bash

echo "🚀 Starting Marketing Automation System..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Create data directory
mkdir -p backend/data
mkdir -p backend/logs

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "⚠️  No .env file found. Creating one from template..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env with your API keys before starting."
    exit 1
fi

echo "📦 Installing dependencies..."
npm run install:all

echo ""
echo "🔧 Building backend..."
cd backend && npm run build && cd ..

echo ""
echo "🎯 Starting development servers..."
echo "   Backend: http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers
npm run dev