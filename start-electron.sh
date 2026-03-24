#!/bin/bash

# SalesDemo Electron Quick Start Script
# This script sets up and runs the Electron app

set -e

echo "🚀 SalesDemo Electron Setup"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Navigate to script directory
cd "$(dirname "$0")"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "✅ Frontend dependencies installed"

# Install electron dependencies
echo ""
echo "📦 Installing Electron dependencies..."
cd ../electron
npm install
echo "✅ Electron dependencies installed"

# Run the app
echo ""
echo "🎉 Setup complete! Starting the app..."
echo ""
echo "🔗 The Vite dev server will start on http://localhost:5173"
echo "📱 The Electron app will open automatically"
echo ""
echo "💡 Tips:"
echo "   - React components hot-reload automatically"
echo "   - Main process changes require app restart"
echo "   - DevTools are available (Ctrl+Shift+I / Cmd+Option+I)"
echo ""

npm run dev

