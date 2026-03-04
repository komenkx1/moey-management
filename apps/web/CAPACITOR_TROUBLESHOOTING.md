# Capacitor Troubleshooting Guide

Panduan troubleshooting untuk masalah umum saat development Capacitor.

## 🔴 Java Version Issues

### Error: "Unsupported class file major version 69"

**Penyebab**: Java 21 tidak kompatibel dengan Gradle 8.2.1

**Solusi yang Sudah Diterapkan**:
- ✅ Updated Gradle wrapper ke 8.7 (support Java 21)
- ✅ Updated Android Gradle Plugin ke 8.3.2

**Jika masih error, coba:**

#### Option 1: Switch ke Java 17 (Recommended)

```bash
# Install Java 17
brew install openjdk@17

# Set JAVA_HOME untuk session saat ini
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Tambahkan ke ~/.zshrc atau ~/.bash_profile untuk permanent
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# Verify
java -version  # Should show Java 17
```

#### Option 2: Clean Gradle Cache

```bash
# Clean Gradle cache
rm -rf ~/.gradle/caches/

# Clean project
cd apps/web/android
./gradlew clean

# Try build again
cd ..
npm run cap:run:android
```

#### Option 3: Use Java 17 for Android Only

```bash
# Create gradle.properties di android folder
echo "org.gradle.java.home=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home" >> apps/web/android/gradle.properties
```

### Check Java Environment

```bash
# Run check script
npm run cap:check-java

# Manual check
java -version
echo $JAVA_HOME
echo $ANDROID_HOME
```

## 🔴 Android SDK Issues

### Error: "ANDROID_HOME not set"

**Solusi**:

```bash
# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$ANDROID_HOME/emulator:$PATH
export PATH=$ANDROID_HOME/platform-tools:$PATH
export PATH=$ANDROID_HOME/tools:$PATH
export PATH=$ANDROID_HOME/tools/bin:$PATH

# Tambahkan ke ~/.zshrc untuk permanent
echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
echo 'export PATH=$ANDROID_HOME/emulator:$PATH' >> ~/.zshrc
echo 'export PATH=$ANDROID_HOME/platform-tools:$PATH' >> ~/.zshrc
source ~/.zshrc
```

### Error: "SDK location not found"

**Solusi**:

```bash
# Create local.properties
echo "sdk.dir=$HOME/Library/Android/sdk" > apps/web/android/local.properties
```

## 🔴 Build Issues

### Error: "Could not open settings generic class cache"

**Solusi**:

```bash
# Clean Gradle cache
rm -rf ~/.gradle/caches/

# Clean project
cd apps/web/android
./gradlew clean --no-daemon

# Rebuild
cd ..
npm run build
npm run cap:sync
npm run cap:run:android
```

### Error: "Execution failed for task ':app:mergeDebugResources'"

**Solusi**:

```bash
# Clean dan rebuild
cd apps/web
rm -rf android/app/build
rm -rf android/build
npm run build
npm run cap:sync
npm run cap:run:android
```

### Error: "out of memory"

**Solusi**:

```bash
# Increase Gradle memory di android/gradle.properties
echo "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m" >> apps/web/android/gradle.properties
```

## 🔴 Emulator Issues

### Error: "No emulators found"

**Solusi**:

```bash
# List available emulators
emulator -list-avds

# Create new emulator via Android Studio
# Tools > Device Manager > Create Device

# Or via command line
avdmanager create avd -n Pixel_6_API_33 -k "system-images;android-33;google_apis;arm64-v8a"
```

### Error: "Emulator won't start"

**Solusi**:

```bash
# Check emulator process
ps aux | grep emulator

# Kill stuck emulator
killall qemu-system-x86_64

# Start emulator manually
emulator -avd Pixel_6_API_33

# Then run app
npm run cap:run:android
```

## 🔴 Capacitor Sync Issues

### Error: "capacitor.config.ts not found"

**Solusi**:

```bash
# Make sure you're in apps/web directory
cd apps/web
pwd  # Should show .../apps/web

# Then run commands
npm run cap:sync
```

### Error: "webDir 'out' does not exist"

**Solusi**:

```bash
# Build first
npm run build

# Verify out folder exists
ls -la out/

# Then sync
npm run cap:sync
```

## 🔴 iOS Issues (macOS only)

### Error: "xcode-select: error: tool 'xcodebuild' requires Xcode"

**Solusi**:

```bash
# Install Xcode from App Store
# Then install command line tools
xcode-select --install

# Accept license
sudo xcodebuild -license accept
```

### Error: "CocoaPods not installed"

**Solusi**:

```bash
# Install CocoaPods
sudo gem install cocoapods

# Or via Homebrew
brew install cocoapods

# Update pods
cd apps/web/ios/App
pod install
```

### Error: "No provisioning profile"

**Solusi**:

1. Open Xcode: `npm run cap:open:ios`
2. Select project in navigator
3. Select "App" target
4. Go to "Signing & Capabilities"
5. Select your Team
6. Xcode will auto-create provisioning profile

## 🔴 Runtime Issues

### Error: "Splash screen won't hide"

**Check**:

```typescript
// In useCapacitor.ts
// Make sure SplashScreen.hide() is called
await SplashScreen.hide();
```

**Debug**:

```bash
# Check console logs
# Android: Chrome DevTools (chrome://inspect)
# iOS: Safari Web Inspector
```

### Error: "Haptics not working"

**Note**: Haptics tidak bekerja di emulator, hanya di real device.

**Test di real device**:

```bash
# Android
adb devices  # Check device connected
npm run cap:run:android

# iOS
npm run cap:run:ios
# Select your device from list
```

### Error: "IndexedDB not working"

**Check**:

```typescript
// Make sure Capacitor scheme is HTTPS
// In capacitor.config.ts
server: {
  androidScheme: 'https',
  iosScheme: 'https'
}
```

## 🔴 Development Workflow Issues

### Changes not reflecting in app

**Solusi**:

```bash
# Full rebuild
npm run build:mobile

# Or step by step
npm run build
npm run cap:sync
npm run cap:run:android
```

### Hot reload not working

**Note**: Hot reload tidak tersedia untuk native apps. Harus rebuild setiap kali ada perubahan.

**Workflow**:

```bash
# For quick UI iteration, use web dev
npm run dev  # http://localhost:3005

# For native testing, rebuild
npm run build:mobile
npm run cap:run:android
```

## 🛠️ Useful Commands

### Check Environment

```bash
# Check Java
java -version
echo $JAVA_HOME

# Check Android SDK
echo $ANDROID_HOME
adb version

# Check Gradle
cd apps/web/android
./gradlew --version
```

### Clean Everything

```bash
# Clean Gradle
rm -rf ~/.gradle/caches/

# Clean project
cd apps/web
rm -rf .next out android/build android/app/build

# Rebuild
npm run build
npm run cap:sync
```

### Debug Build

```bash
# Build with stacktrace
cd apps/web/android
./gradlew assembleDebug --stacktrace

# Build with debug info
./gradlew assembleDebug --debug
```

### Check Capacitor

```bash
# Check Capacitor doctor
npx cap doctor

# List plugins
npx cap ls

# Update Capacitor
npm update @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap sync
```

## 📞 Getting Help

### Check Logs

**Android**:
```bash
adb logcat | grep Capacitor
```

**iOS**:
```bash
# In Xcode: Window > Devices and Simulators > Open Console
```

### Capacitor Doctor

```bash
npx cap doctor
```

### Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Capacitor GitHub Issues](https://github.com/ionic-team/capacitor/issues)
- [Android Developer Docs](https://developer.android.com/docs)
- [Gradle Docs](https://docs.gradle.org/)

## 🎯 Quick Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| Java version error | Switch to Java 17: `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` |
| Gradle cache error | `rm -rf ~/.gradle/caches/` |
| Build failed | `cd android && ./gradlew clean` |
| Sync failed | `npm run build && npm run cap:sync` |
| Emulator not found | Create in Android Studio Device Manager |
| Changes not showing | `npm run build:mobile` |
| Haptics not working | Test on real device, not emulator |

## 💡 Pro Tips

1. **Use Java 17** for most stable Android development
2. **Clean Gradle cache** when switching Java versions
3. **Test haptics on real devices** only
4. **Use web dev** for quick UI iteration
5. **Rebuild after every code change** for native testing
6. **Check logs** in Chrome DevTools (Android) or Safari Inspector (iOS)
7. **Keep dependencies updated** but test thoroughly
