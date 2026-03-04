# Capacitor Quick Start - KeMana

Panduan cepat untuk mulai development native dengan Capacitor.

## Prerequisites

### Untuk Android Development

1. **Java Development Kit (JDK) 17**
   ```bash
   # macOS (via Homebrew)
   brew install openjdk@17
   
   # Verify
   java -version
   ```

2. **Android Studio**
   - Download dari https://developer.android.com/studio
   - Install Android SDK (API 33 atau lebih tinggi)
   - Setup Android Virtual Device (AVD) untuk testing

3. **Environment Variables**
   ```bash
   # Tambahkan ke ~/.zshrc atau ~/.bash_profile
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   ```

### Untuk iOS Development (macOS only)

1. **Xcode**
   - Install dari Mac App Store
   - Minimal Xcode 14.0
   - Install Command Line Tools:
     ```bash
     xcode-select --install
     ```

2. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   ```

## Setup Project (First Time)

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

### 2. Build Static Export

```bash
npm run build
```

Pastikan folder `out/` terbuat dengan sukses.

### 3. Add Native Platforms

#### Android

```bash
npx cap add android
```

Ini akan membuat folder `android/` dengan project Android Studio.

#### iOS (macOS only)

```bash
npx cap add ios
```

Ini akan membuat folder `ios/` dengan project Xcode.

### 4. Sync Assets

```bash
npx cap sync
```

Atau gunakan script yang sudah disediakan:

```bash
npm run cap:sync
```

## Development Workflow

### Iterasi Web (Recommended untuk UI Development)

```bash
# Terminal 1: Run dev server
npm run dev

# Browser: http://localhost:3005
```

Gunakan ini untuk development UI/UX yang cepat. Capacitor APIs akan fallback ke web implementation.

### Testing di Native

#### Android

```bash
# 1. Build web assets
npm run build

# 2. Sync ke Android
npm run cap:sync

# 3. Run di emulator/device
npm run cap:run:android
```

Atau buka Android Studio untuk debugging:

```bash
npm run cap:open:android
```

#### iOS

```bash
# 1. Build web assets
npm run build

# 2. Sync ke iOS
npm run cap:sync

# 3. Run di simulator/device
npm run cap:run:ios
```

Atau buka Xcode untuk debugging:

```bash
npm run cap:open:ios
```

## Common Commands

```bash
# Build web + sync native
npm run build:mobile

# Sync tanpa rebuild
npm run cap:sync

# Run Android
npm run cap:run:android

# Run iOS
npm run cap:run:ios

# Open Android Studio
npm run cap:open:android

# Open Xcode
npm run cap:open:ios
```

## Debugging

### Web Console di Native

#### Android (Chrome DevTools)

1. Connect device via USB atau run emulator
2. Open Chrome: `chrome://inspect`
3. Find your app dan click "inspect"

#### iOS (Safari Web Inspector)

1. Enable Web Inspector di iOS:
   - Settings > Safari > Advanced > Web Inspector
2. Connect device atau run simulator
3. Safari > Develop > [Device Name] > [App Name]

### Native Logs

#### Android (Logcat)

```bash
# Via adb
adb logcat | grep Capacitor

# Atau di Android Studio
View > Tool Windows > Logcat
```

#### iOS (Console)

```bash
# Via Xcode
Window > Devices and Simulators > Open Console
```

## Troubleshooting

### "capacitor.config.ts not found"

Pastikan Anda di folder `apps/web/` saat menjalankan command Capacitor.

### "Android SDK not found"

Set environment variable `ANDROID_HOME`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
```

### "No provisioning profile" (iOS)

1. Open Xcode
2. Select project > Signing & Capabilities
3. Select your Team
4. Xcode akan otomatis create provisioning profile

### Build error setelah update dependencies

```bash
# Clean dan rebuild
rm -rf out .next
npm run build
npx cap sync
```

### Capacitor plugins tidak bekerja

Pastikan:
1. Plugin sudah di-install: `npm install @capacitor/[plugin-name]`
2. Sudah sync: `npx cap sync`
3. Check di native code apakah plugin ter-register

## Next Steps

1. ✅ Setup development environment
2. ✅ Add platforms (android/ios)
3. ⏳ Test basic functionality di native
4. ⏳ Integrate haptic feedback ke UI
5. ⏳ Setup app icons & splash screens
6. ⏳ Configure signing untuk release
7. ⏳ Test di real devices
8. ⏳ Prepare untuk deployment

## Resources

- [Capacitor CLI Reference](https://capacitorjs.com/docs/cli)
- [Android Development](https://capacitorjs.com/docs/android)
- [iOS Development](https://capacitorjs.com/docs/ios)
- [Debugging Guide](https://capacitorjs.com/docs/guides/debugging)
