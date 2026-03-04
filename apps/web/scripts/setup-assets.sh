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

# Colors for launch/splash background
BACKGROUND_COLOR="#F7F8FA"
DARK_BACKGROUND_COLOR="#000000"
# Default logo scale for splash source compositing (can override via env)
SPLASH_LOGO_SCALE="${SPLASH_LOGO_SCALE:-0.38}"

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

# Copy splash screen sources from public
if [ -f "public/splash-2048.png" ]; then
    echo "📋 Copying splash screen..."

    if node -e "require('sharp')" >/dev/null 2>&1; then
        generate_scaled_splash_variant() {
            local source_path="$1"
            local target_path="$2"
            local bg_color="$3"

            SOURCE_PATH="$source_path" TARGET_PATH="$target_path" BG_COLOR="$bg_color" LOGO_SCALE="$SPLASH_LOGO_SCALE" node <<'NODE'
const sharp = require('sharp');

const sourcePath = process.env.SOURCE_PATH;
const targetPath = process.env.TARGET_PATH;
const bgColor = process.env.BG_COLOR;
const logoScale = Number.parseFloat(process.env.LOGO_SCALE ?? "0.88");

(async () => {
  const source = sharp(sourcePath);
  const metadata = await source.metadata();

  const width = metadata.width ?? 2048;
  const height = metadata.height ?? 2048;
  const safeScale = Number.isFinite(logoScale) ? Math.min(Math.max(logoScale, 0.4), 1) : 0.88;

  const scaledWidth = Math.max(1, Math.round(width * safeScale));
  const scaledHeight = Math.max(1, Math.round(height * safeScale));

  const scaledLogo = await source
    .resize(scaledWidth, scaledHeight, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: bgColor,
    },
  })
    .composite([{ input: scaledLogo, gravity: "center" }])
    .png()
    .toFile(targetPath);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
NODE
        }

        generate_scaled_splash_variant "public/splash-2048.png" "assets/splash.png" "$BACKGROUND_COLOR"
        echo "✅ Splash screen generated (scale ${SPLASH_LOGO_SCALE}) to assets/splash.png"

        # Keep dark splash scale/composition identical to light by default.
        # If a dedicated dark asset exists, prefer it.
        if [ -f "public/splash-dark-2048.png" ]; then
            generate_scaled_splash_variant "public/splash-dark-2048.png" "assets/splash-dark.png" "$DARK_BACKGROUND_COLOR"
            echo "✅ Dark splash generated from dedicated source (scale ${SPLASH_LOGO_SCALE})"
        else
            generate_scaled_splash_variant "public/splash-2048.png" "assets/splash-dark.png" "$DARK_BACKGROUND_COLOR"
            echo "✅ Dark splash generated from light source (scale ${SPLASH_LOGO_SCALE})"
        fi
    else
        cp public/splash-2048.png assets/splash.png
        echo "⚠️  sharp not found; splash copied without scaling"

        if [ -f "public/splash-dark-2048.png" ]; then
            cp public/splash-dark-2048.png assets/splash-dark.png
            echo "⚠️  sharp not found; dark splash copied without scaling"
        else
            cp public/splash-2048.png assets/splash-dark.png
            echo "⚠️  sharp not found; dark splash fallback copied from light source"
        fi
    fi
else
    echo "❌ Error: public/splash-2048.png not found"
    exit 1
fi

# Ensure iOS launch background follows light/dark mode.
configure_ios_launch_background() {
    local asset_catalog_path="ios/App/App/Assets.xcassets"
    local colorset_path="$asset_catalog_path/SplashBackground.colorset"
    local storyboard_path="ios/App/App/Base.lproj/LaunchScreen.storyboard"

    if [ ! -d "$asset_catalog_path" ] || [ ! -f "$storyboard_path" ]; then
        echo "⚠️  iOS launch screen files not found, skip dark/light background patch"
        return
    fi

    mkdir -p "$colorset_path"
    cat > "$colorset_path/Contents.json" <<'JSON'
{
  "colors" : [
    {
      "color" : {
        "color-space" : "srgb",
        "components" : {
          "alpha" : "1.0000000000",
          "blue" : "0.9803921569",
          "green" : "0.9725490196",
          "red" : "0.9686274510"
        }
      },
      "idiom" : "universal"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "dark"
        }
      ],
      "color" : {
        "color-space" : "srgb",
        "components" : {
          "alpha" : "1.0000000000",
          "blue" : "0.0000000000",
          "green" : "0.0000000000",
          "red" : "0.0000000000"
        }
      },
      "idiom" : "universal"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
JSON

    if grep -q 'key="backgroundColor" systemColor="systemBackgroundColor"' "$storyboard_path"; then
        sed -i '' 's/<color key="backgroundColor" systemColor="systemBackgroundColor"\/>/<color key="backgroundColor" name="SplashBackground"\/>/' "$storyboard_path"
    fi

    if ! grep -q 'key="backgroundColor" name="SplashBackground"' "$storyboard_path"; then
        echo "⚠️  Could not patch LaunchScreen.storyboard background color reference"
        return
    fi

    echo "✅ iOS launch background configured for light/dark mode"
}

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
echo "Generating with background color: $BACKGROUND_COLOR"
echo ""

./node_modules/.bin/capacitor-assets generate \
    --iconBackgroundColor "$BACKGROUND_COLOR" \
    --iconBackgroundColorDark "$DARK_BACKGROUND_COLOR" \
    --splashBackgroundColor "$BACKGROUND_COLOR" \
    --splashBackgroundColorDark "$DARK_BACKGROUND_COLOR"

if [ $? -eq 0 ]; then
    if [ -d "ios" ]; then
        configure_ios_launch_background
    fi

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
