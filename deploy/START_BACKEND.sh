#!/bin/bash

# Quick script to start backend server
# Run this on the server if backend is not running

set -e

echo "🔧 Starting Nefol Backend Server..."

cd /var/www/nefol

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "⚠️  .env file not found, creating from env.example..."
    cp backend/env.example backend/.env
    echo "⚠️  Please edit backend/.env with production values!"
    echo "⚠️  Especially: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY"
fi

# Install dependencies if needed
if [ ! -d backend/node_modules ]; then
    echo "📦 Installing dependencies..."
    cd backend
    npm install --production
    cd ..
fi

# Stop existing process
echo "🛑 Stopping existing backend..."
pm2 delete nefol-backend || true

# Start backend
echo "🚀 Starting backend..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Show status
echo "✅ Backend status:"
pm2 status

# Show recent logs
echo "📋 Recent logs:"
pm2 logs nefol-backend --lines 20 --nostream

echo ""
echo "✅ Backend should now be running!"
echo "🌐 Test: curl http://localhost:2000/api"
echo "📊 Monitor: pm2 logs nefol-backend"

