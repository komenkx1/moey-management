#!/bin/bash

# Setup Assets Script
# Copy icon dan splash screen, kemudian generate untuk native platforms

set -e

echo "🎨 Setting up app icons and splash screens"
echo "==========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Error: capacitor.config.ts not found"
    echo "Please run this script from apps/web directory"
    exit 1
fi

# Create assets directory if not exists
mkdir -p assets

# Copy icon from public
if [ -f "public/icons/icon-512.png" ]; then
    echo "📋 Copying app icon..."
    cp public/icons/icon-512.png assets/icon.png
    echo "✅ Icon copied to assets/icon.png"
else
    echo "❌ Error: public/icons/icon-512.png not found"
    exit 1
fi

# Copy splash screen from public
if [ -f "public/splash-2048.png" ]; then
    echo "📋 Copying splash screen..."
    cp public/splash-2048.png assets/splash.png
    echo "✅ Splash screen copied to assets/splash.png"
else
    echo "❌ Error: public/splash-2048.png not found"
    exit 1
fi

echo ""
echo "🎨 Generating native assets..."
echo ""

# Check if platforms exist
if [ ! -d "android" ] && [ ! -d "ios" ]; then
    echo "⚠️  Warning: No native platforms found"
    echo "Run 'npm run cap:setup' first to add platforms"
    echo ""
    echo "Assets are ready in assets/ folder"
    echo "Run this script again after adding platforms"
    exit 0
fi

# Generate assets for native platforms
# Background color untuk splash screen (light theme)
BACKGROUND_COLOR="#F7F8FA"

echo "Generating with background color: $BACKGROUND_COLOR"
echo ""

npx @capacitor/assets generate \
    --iconBackgroundColor "$BACKGROUND_COLOR" \
    --iconBackgroundColorDark "#000000" \
    --splashBackgroundColor "$BACKGROUND_COLOR" \
    --splashBackgroundColorDark "#000000"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Assets generated successfully!"
    echo ""
    echo "Generated assets:"
    
    if [ -d "android" ]; then
        echo "  📱 Android:"
        echo "     - App icons (mipmap)"
        echo "     - Splash screens (drawable)"
    fi
    
    if [ -d "ios" ]; then
        echo "  📱 iOS:"
        echo "     - App icons (Assets.xcassets)"
        echo "     - Splash screens (Assets.xcassets)"
    fi
    
    echo ""
    echo "Next steps:"
    echo "  1. npm run build:mobile"
    echo "  2. npm run cap:run:android (or ios)"
    echo "  3. Check app icon on home screen"
    echo "  4. Check splash screen on app launch"
else
    echo ""
    echo "❌ Error generating assets"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Make sure assets/icon.png is at least 1024x1024"
    echo "  2. Make sure assets/splash.png is at least 2732x2732"
    echo "  3. Try: npm install @capacitor/assets"
    exit 1
fi

echo ""
echo "==========================================="
echo "🎉 Asset setup complete!"
