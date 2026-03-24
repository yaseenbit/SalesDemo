#!/bin/bash

# SalesDemo Electron Build Script
# Creates distribution packages for macOS, Windows, and Linux

set -e

cd "$(dirname "$0")/electron"

echo "🔨 Building SalesDemo Electron App"
echo "==================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build
echo ""
echo "🔨 Building..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Packages are available in: electron/out/"
echo ""
echo "Distribution files created for:"
echo "  - macOS (Intel & Apple Silicon): .dmg, .zip"
echo "  - Windows: .exe (NSIS installer & portable)"
echo "  - Linux: .AppImage, .deb"
echo ""
echo "To distribute, sign the packages:"
echo "  - macOS: Requires Apple Developer certificate"
echo "  - Windows: Requires code signing certificate"
echo "  - Linux: No signature required for AppImage"

