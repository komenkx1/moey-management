#!/bin/bash

# Check Java Version Script
# Membantu troubleshoot Java version issues untuk Android build

echo "🔍 Checking Java Environment"
echo "=============================="
echo ""

# Check Java version
if command -v java &> /dev/null; then
    echo "✅ Java found:"
    java -version 2>&1 | head -3
    echo ""
    
    # Extract version number
    JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2 | cut -d'.' -f1)
    
    if [ "$JAVA_VERSION" -ge 17 ] && [ "$JAVA_VERSION" -le 21 ]; then
        echo "✅ Java version is compatible (17-21)"
    else
        echo "⚠️  Warning: Java version might not be compatible"
        echo "   Recommended: Java 17 or Java 21"
    fi
else
    echo "❌ Java not found"
    echo ""
    echo "Please install Java:"
    echo "  brew install openjdk@17"
    echo ""
    exit 1
fi

echo ""

# Check JAVA_HOME
if [ -n "$JAVA_HOME" ]; then
    echo "✅ JAVA_HOME is set:"
    echo "   $JAVA_HOME"
else
    echo "⚠️  JAVA_HOME is not set"
    echo ""
    echo "To set JAVA_HOME, add to ~/.zshrc or ~/.bash_profile:"
    echo "  export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
    echo "  export PATH=\$JAVA_HOME/bin:\$PATH"
fi

echo ""

# Check Android SDK
if [ -n "$ANDROID_HOME" ]; then
    echo "✅ ANDROID_HOME is set:"
    echo "   $ANDROID_HOME"
else
    echo "⚠️  ANDROID_HOME is not set"
    echo ""
    echo "To set ANDROID_HOME, add to ~/.zshrc or ~/.bash_profile:"
    echo "  export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "  export PATH=\$ANDROID_HOME/emulator:\$PATH"
    echo "  export PATH=\$ANDROID_HOME/platform-tools:\$PATH"
fi

echo ""

# Check Gradle
if [ -f "android/gradlew" ]; then
    echo "✅ Gradle wrapper found"
    echo ""
    echo "Gradle version:"
    ./android/gradlew --version 2>&1 | grep "Gradle" | head -1
else
    echo "⚠️  Gradle wrapper not found"
    echo "   Run: npx cap add android"
fi

echo ""
echo "=============================="
echo ""

# Recommendations
if [ "$JAVA_VERSION" -eq 21 ]; then
    echo "💡 Recommendations:"
    echo ""
    echo "You're using Java 21. If you encounter build issues:"
    echo ""
    echo "Option 1: Switch to Java 17 (more stable for Android)"
    echo "  brew install openjdk@17"
    echo "  export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
    echo ""
    echo "Option 2: Update Gradle (already done in gradle-wrapper.properties)"
    echo "  Gradle 8.7+ supports Java 21"
    echo ""
fi

echo "To apply environment changes:"
echo "  source ~/.zshrc  # or ~/.bash_profile"
echo ""
