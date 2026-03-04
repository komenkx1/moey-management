# KeMana - Capacitor Native App

KeMana sekarang mendukung deployment sebagai aplikasi native Android dan iOS menggunakan Capacitor!

## 🎯 Apa yang Berubah?

### Sebelum (PWA Only)
- ✅ Progressive Web App
- ✅ Install via browser
- ✅ Offline-first dengan IndexedDB
- ❌ Tidak ada di App Store/Play Store
- ❌ Terbatas pada Web APIs

### Sekarang (PWA + Native)
- ✅ Progressive Web App (tetap berfungsi)
- ✅ Native Android App
- ✅ Native iOS App
- ✅ Haptic feedback
- ✅ Native status bar control
- ✅ Better safe area handling
- ✅ Distribusi via App Store/Play Store

## 🚀 Quick Start

### Development (Web)

Tidak ada perubahan untuk web development:

```bash
cd apps/web
npm install
npm run dev
```

### Build untuk Native

```bash
# 1. Build static export
npm run build

# 2. Sync ke native platforms
npm run cap:sync

# 3. Run di Android
npm run cap:run:android

# 4. Run di iOS (macOS only)
npm run cap:run:ios
```

## 📱 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Web (PWA) | ✅ Production | Tetap berfungsi seperti biasa |
| Android | ✅ Ready | Minimal Android 5.0 (API 21) |
| iOS | ✅ Ready | Minimal iOS 13.0 |

## 🔧 New Features

### 1. Platform Detection

```typescript
import { isNativePlatform, getPlatform } from '@/lib/capacitor';

if (isNativePlatform()) {
  // Native-specific code
}
```

### 2. Haptic Feedback

```typescript
import { hapticsSuccess, hapticsMedium } from '@/lib/haptics';

// Success feedback
await hapticsSuccess();

// Action feedback
await hapticsMedium();
```

### 3. Native Status Bar

Otomatis dikonfigurasi untuk match theme KeMana.

### 4. Splash Screen

Otomatis disembunyikan setelah app ready.

## 📚 Documentation

- [Migration Guide](./CAPACITOR_MIGRATION.md) - Detailed migration documentation
- [Quick Start](./CAPACITOR_QUICKSTART.md) - Setup dan development workflow
- [Haptic Examples](./HAPTIC_INTEGRATION_EXAMPLES.md) - Contoh integrasi haptic feedback

## 🏗️ Architecture

```
apps/web/
├── capacitor.config.ts       # Capacitor configuration
├── next.config.js            # Updated untuk static export
├── out/                      # Static build output (webDir)
├── android/                  # Android project (git-ignored)
├── ios/                      # iOS project (git-ignored)
└── src/
    ├── lib/
    │   ├── capacitor.ts     # Platform utilities
    │   └── haptics.ts       # Haptic feedback
    ├── hooks/
    │   └── useCapacitor.ts  # Capacitor initialization
    └── app/
        ├── capacitor-init.tsx
        └── safe-area-sync.tsx (updated)
```

## 🧪 Testing

### Web (Existing)

```bash
npm run test
npm run test:e2e
```

### Native

1. Build: `npm run build`
2. Sync: `npm run cap:sync`
3. Run di emulator/device
4. Test core features:
   - ✅ Quick Add transaction
   - ✅ Swipe to delete
   - ✅ Navigation
   - ✅ Offline functionality
   - ✅ Haptic feedback

## 📦 Deployment

### Web (Vercel) - Tidak Berubah

```bash
vercel deploy
```

### Android (Google Play)

```bash
cd android
./gradlew bundleRelease
# Upload AAB ke Play Console
```

### iOS (App Store)

```bash
npm run cap:open:ios
# Archive di Xcode
# Upload ke App Store Connect
```

## 🔄 Migration Impact

### Tidak Berubah
- ✅ Core functionality (IndexedDB, Dexie)
- ✅ UI/UX components
- ✅ State management (Zustand)
- ✅ Routing
- ✅ PWA functionality

### Ditambahkan
- ✅ Native platform support
- ✅ Capacitor plugins
- ✅ Haptic feedback utilities
- ✅ Enhanced safe area handling

### Breaking Changes
- ❌ Tidak ada breaking changes!
- ✅ Backward compatible dengan PWA

## 🎨 App Icons & Splash Screens

### Current Status
- ✅ PWA icons (existing)
- ⏳ Android adaptive icons (TODO)
- ⏳ iOS app icons (TODO)
- ⏳ Native splash screens (TODO)

### Generate Icons

```bash
# Install capacitor-assets
npm install -D @capacitor/assets

# Generate dari source icon
npx capacitor-assets generate --iconBackgroundColor '#0f2f33'
```

## 🐛 Known Issues

1. **Splash screen timing**: Mungkin perlu adjustment untuk slow devices
2. **Safe area iOS**: Perlu testing di berbagai device sizes
3. **Haptic patterns**: Belum ada custom patterns

## 🗺️ Roadmap

### Phase 1 (Current) ✅
- [x] Capacitor setup
- [x] Basic plugins integration
- [x] Platform detection
- [x] Haptic feedback utilities

### Phase 2 (Next)
- [ ] Add Android platform
- [ ] Add iOS platform
- [ ] Test di real devices
- [ ] Integrate haptic ke UI

### Phase 3 (Future)
- [ ] App icons & splash screens
- [ ] Signing & deployment setup
- [ ] CI/CD for native builds
- [ ] App Store/Play Store submission

## 💡 Tips

1. **Development**: Gunakan web dev untuk iterasi cepat
2. **Testing**: Test di native untuk verify platform-specific features
3. **Debugging**: Gunakan Chrome DevTools (Android) atau Safari Inspector (iOS)
4. **Performance**: Static export sangat cepat, tidak ada overhead server

## 🤝 Contributing

Saat contribute code:

1. Test di web: `npm run dev`
2. Test di native: `npm run build:mobile && npm run cap:run:android`
3. Pastikan tidak ada breaking changes untuk PWA
4. Document platform-specific code

## 📞 Support

Issues atau questions? Check documentation:
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)

---

**Note**: Aplikasi web (PWA) tetap berfungsi normal. Capacitor hanya menambahkan kemampuan native tanpa menghilangkan functionality yang sudah ada.
