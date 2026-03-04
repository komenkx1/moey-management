#!/bin/bash

# Sync Version Script
# Sync version dari package.json ke Android dan iOS

set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

if [ -z "$VERSION" ]; then
    echo "❌ Error: Could not read version from package.json"
    exit 1
fi

echo "📦 Syncing version: $VERSION"

# Parse version (e.g., "2.0.69" -> major=2, minor=0, patch=69)
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

echo "   Version Name: $VERSION"
echo "   Version Code: $VERSION_CODE"

# Update Android version
if [ -d "android" ]; then
    echo ""
    echo "📱 Updating Android version..."
    
    GRADLE_FILE="android/app/build.gradle"
    
    if [ -f "$GRADLE_FILE" ]; then
        # Update versionCode
        sed -i.bak "s/versionCode [0-9]*/versionCode $VERSION_CODE/" "$GRADLE_FILE"
        
        # Update versionName
        sed -i.bak "s/versionName \"[^\"]*\"/versionName \"$VERSION\"/" "$GRADLE_FILE"
        
        # Remove backup file
        rm -f "$GRADLE_FILE.bak"
        
        echo "   ✅ Android version updated"
        echo "      versionCode: $VERSION_CODE"
        echo "      versionName: $VERSION"
    else
        echo "   ⚠️  Warning: $GRADLE_FILE not found"
    fi
else
    echo ""
    echo "⚠️  Android platform not found, skipping"
fi

# Update iOS version
if [ -d "ios" ]; then
    echo ""
    echo "📱 Updating iOS version..."
    
    PLIST_FILE="ios/App/App/Info.plist"
    
    if [ -f "$PLIST_FILE" ]; then
        # Update CFBundleShortVersionString (version)
        /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" "$PLIST_FILE" 2>/dev/null || \
        /usr/libexec/PlistBuddy -c "Add :CFBundleShortVersionString string $VERSION" "$PLIST_FILE"
        
        # Update CFBundleVersion (build number)
        /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $VERSION_CODE" "$PLIST_FILE" 2>/dev/null || \
        /usr/libexec/PlistBuddy -c "Add :CFBundleVersion string $VERSION_CODE" "$PLIST_FILE"
        
        echo "   ✅ iOS version updated"
        echo "      CFBundleShortVersionString: $VERSION"
        echo "      CFBundleVersion: $VERSION_CODE"
    else
        echo "   ⚠️  Warning: $PLIST_FILE not found"
    fi
else
    echo ""
    echo "⚠️  iOS platform not found, skipping"
fi

echo ""
echo "✅ Version sync complete!"
echo ""
echo "Next steps:"
echo "  • Commit the version changes"
echo "  • Build: npm run build:mobile"
echo "  • Test on devices"
