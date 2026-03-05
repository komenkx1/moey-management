#!/bin/bash

# Fix Java Environment Script
# Membantu setup Java 17 untuk Android development

echo "🔧 Fixing Java Environment for Android"
echo "========================================"
echo ""

# Check if Java 17 is installed
if /usr/libexec/java_home -v 17 &> /dev/null; then
    JAVA_17_HOME=$(/usr/libexec/java_home -v 17)
    echo "✅ Java 17 found at: $JAVA_17_HOME"
    echo ""
    
    # Set for current session
    export JAVA_HOME=$JAVA_17_HOME
    export PATH=$JAVA_HOME/bin:$PATH
    
    echo "✅ JAVA_HOME set to Java 17 for current session"
    echo ""
    
    # Check user default shell instead of script execution shell
    USER_SHELL=$(basename "$SHELL")
    if [ "$USER_SHELL" = "zsh" ]; then
        SHELL_RC="$HOME/.zshrc"
    elif [ "$USER_SHELL" = "bash" ]; then
        SHELL_RC="$HOME/.bash_profile"
    else
        SHELL_RC="$HOME/.profile"
    fi
    
    # Ask to make permanent
    echo "Do you want to make this permanent? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        # Backup shell rc
        cp "$SHELL_RC" "$SHELL_RC.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Remove old JAVA_HOME if exists
        sed -i.tmp '/export JAVA_HOME.*java_home/d' "$SHELL_RC"
        rm -f "$SHELL_RC.tmp"
        
        # Add new JAVA_HOME
        echo "" >> "$SHELL_RC"
        echo "# Java 17 for Android development" >> "$SHELL_RC"
        echo "export JAVA_HOME=\$(/usr/libexec/java_home -v 17)" >> "$SHELL_RC"
        echo "export PATH=\$JAVA_HOME/bin:\$PATH" >> "$SHELL_RC"
        
        echo "✅ Added to $SHELL_RC"
        echo ""
        echo "To apply changes:"
        echo "  source $SHELL_RC"
    fi
    
    echo ""
    echo "Current Java version:"
    java -version 2>&1 | head -1
    
else
    echo "❌ Java 17 not found"
    echo ""
    echo "Installing Java 17..."
    echo ""
    
    if command -v brew &> /dev/null; then
        brew install openjdk@17
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Java 17 installed successfully"
            echo ""
            echo "Run this script again to configure JAVA_HOME"
        else
            echo "❌ Failed to install Java 17"
            exit 1
        fi
    else
        echo "❌ Homebrew not found"
        echo ""
        echo "Please install Homebrew first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
fi

echo ""
echo "========================================"
echo ""

# Setup ANDROID_HOME if not set
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME is not set"
    echo ""
    
    # Check if Android SDK exists
    if [ -d "$HOME/Library/Android/sdk" ]; then
        echo "✅ Android SDK found at: $HOME/Library/Android/sdk"
        echo ""
        echo "Do you want to set ANDROID_HOME? (y/n)"
        read -r response
        
        if [[ "$response" =~ ^[Yy]$ ]]; then
            # Add to shell rc
            echo "" >> "$SHELL_RC"
            echo "# Android SDK" >> "$SHELL_RC"
            echo "export ANDROID_HOME=\$HOME/Library/Android/sdk" >> "$SHELL_RC"
            echo "export PATH=\$ANDROID_HOME/emulator:\$PATH" >> "$SHELL_RC"
            echo "export PATH=\$ANDROID_HOME/platform-tools:\$PATH" >> "$SHELL_RC"
            echo "export PATH=\$ANDROID_HOME/tools:\$PATH" >> "$SHELL_RC"
            echo "export PATH=\$ANDROID_HOME/tools/bin:\$PATH" >> "$SHELL_RC"
            
            echo "✅ Added ANDROID_HOME to $SHELL_RC"
            echo ""
            echo "To apply changes:"
            echo "  source $SHELL_RC"
        fi
    else
        echo "❌ Android SDK not found at $HOME/Library/Android/sdk"
        echo ""
        echo "Please install Android Studio and SDK first"
    fi
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps to apply the changes:"

if [ -n "$ZSH_VERSION" ] || [[ "$SHELL" == *"zsh"* ]]; then
    echo "  1. Sourcing your ZSH profile:"
    echo "     source ~/.zshrc"
    echo "     (Or completely close this terminal window and open a new one)"
else
    echo "  1. Sourcing your Bash profile:"
    echo "     source $SHELL_RC"
    echo "     (Or completely close this terminal window and open a new one)"
fi

echo "  2. npm run cap:check-java   # Verify setup"
echo "  3. npm run cap:run:android  # Try build again"
echo ""
