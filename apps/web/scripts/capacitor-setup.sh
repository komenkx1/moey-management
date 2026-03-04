#!/bin/bash

# Capacitor Setup Script
# Script untuk first-time setup Capacitor platforms

set -e

echo "🚀 KeMana Capacitor Setup"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Error: capacitor.config.ts not found"
    echo "Please run this script from apps/web directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build static export
echo ""
echo "🔨 Building static export..."
npm run build

if [ ! -d "out" ]; then
    echo "❌ Error: Build failed, 'out' directory not found"
    exit 1
fi

echo "✅ Build successful"

# Ask user which platforms to add
echo ""
echo "Which platforms do you want to add?"
echo "1) Android only"
echo "2) iOS only (macOS required)"
echo "3) Both Android and iOS"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📱 Adding Android platform..."
        npx cap add android
        echo "✅ Android platform added"
        ;;
    2)
        if [[ "$OSTYPE" != "darwin"* ]]; then
            echo "❌ Error: iOS development requires macOS"
            exit 1
        fi
        echo ""
        echo "📱 Adding iOS platform..."
        npx cap add ios
        echo "✅ iOS platform added"
        ;;
    3)
        echo ""
        echo "📱 Adding Android platform..."
        npx cap add android
        echo "✅ Android platform added"
        
        if [[ "$OSTYPE" != "darwin"* ]]; then
            echo "⚠️  Warning: iOS development requires macOS, skipping iOS"
        else
            echo ""
            echo "📱 Adding iOS platform..."
            npx cap add ios
            echo "✅ iOS platform added"
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Sync assets
echo ""
echo "🔄 Syncing assets to native platforms..."
npx cap sync

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  • Run Android: npm run cap:run:android"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  • Run iOS: npm run cap:run:ios"
fi
echo "  • Open Android Studio: npm run cap:open:android"
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "  • Open Xcode: npm run cap:open:ios"
fi
echo ""
echo "📚 Documentation: ./CAPACITOR_QUICKSTART.md"
