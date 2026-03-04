# Migrasi Capacitor - KeMana

Dokumentasi lengkap migrasi KeMana dari Next.js PWA ke aplikasi native menggunakan Capacitor.

## Status Implementasi

✅ Fase 1: Persiapan Next.js Static Export
✅ Fase 2: Instalasi & Konfigurasi Capacitor
✅ Fase 3: Integrasi Plugin Native
✅ Fase 4: Safe Area & Status Bar
✅ Fase 5: Haptic Feedback
⏳ Fase 6: Testing & Platform Setup

## Arsitektur

```
apps/web/
├── capacitor.config.ts          # Konfigurasi Capacitor
├── out/                          # Output static Next.js (webDir)
├── android/                      # Project Android (akan dibuat)
├── ios/                          # Project iOS (akan dibuat)
└── src/
    ├── lib/
    │   ├── capacitor.ts         # Platform detection utilities
    │   └── haptics.ts           # Haptic feedback utilities
    ├── hooks/
    │   └── useCapacitor.ts      # Capacitor initialization hook
    └── app/
        ├── capacitor-init.tsx   # Capacitor init component
        └── safe-area-sync.tsx   # Updated untuk native support
```

## Setup Awal

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

Dependencies yang ditambahkan:
- `@capacitor/core` - Core Capacitor runtime
- `@capacitor/cli` - CLI tools
- `@capacitor/android` - Android platform
- `@capacitor/ios` - iOS platform
- `@capacitor/status-bar` - Status bar control
- `@capacitor/splash-screen` - Splash screen management
- `@capacitor/keyboard` - Keyboard behavior
- `@capacitor/haptics` - Haptic feedback

### 2. Build Static Export

```bash
npm run build
```

Ini akan menghasilkan folder `out/` dengan static HTML/CSS/JS.

### 3. Initialize Platforms

Untuk pertama kali, jalankan:

```bash
# Tambahkan platform Android
npx cap add android

# Tambahkan platform iOS (hanya di macOS)
npx cap add ios
```

### 4. Sync Assets ke Native

Setiap kali ada perubahan di web code:

```bash
npm run build:mobile
# atau
npm run cap:sync
```

## Development Workflow

### Web Development (Seperti Biasa)

```bash
npm run dev
```

Buka http://localhost:3005

### Native Development

#### Android

```bash
# Build dan sync
npm run build:mobile

# Run di emulator/device
npm run cap:run:android

# Atau buka Android Studio
npm run cap:open:android
```

#### iOS (macOS only)

```bash
# Build dan sync
npm run build:mobile

# Run di simulator/device
npm run cap:run:ios

# Atau buka Xcode
npm run cap:open:ios
```

## Fitur Native yang Diimplementasikan

### 1. Platform Detection

```typescript
import { isNativePlatform, getPlatform, isNativeIOS, isNativeAndroid } from '@/lib/capacitor';

if (isNativePlatform()) {
  // Kode khusus native
}

const platform = getPlatform(); // 'ios' | 'android' | 'web'
```

### 2. Haptic Feedback

```typescript
import { hapticsLight, hapticsMedium, hapticsSuccess } from '@/lib/haptics';

// Feedback ringan untuk tap
await hapticsLight();

// Feedback medium untuk actions
await hapticsMedium();

// Feedback untuk success
await hapticsSuccess();
```

### 3. Safe Area & Status Bar

Otomatis ditangani oleh `SafeAreaSync` component yang sudah diupdate untuk mendeteksi native platform.

### 4. Splash Screen

Otomatis disembunyikan setelah app ready (500ms delay untuk memastikan UI ter-render).

## Konfigurasi

### capacitor.config.ts

```typescript
{
  appId: 'com.kemana.app',
  appName: 'KeMana',
  webDir: 'out',
  plugins: {
    SplashScreen: { ... },
    StatusBar: { ... },
    Keyboard: { ... }
  }
}
```

### next.config.js

```javascript
{
  output: "export",
  images: { unoptimized: true }
}
```

## Testing

### Web Testing (Existing)

```bash
npm run test
npm run test:e2e
```

### Native Testing

1. Build static export: `npm run build`
2. Sync ke native: `npm run cap:sync`
3. Run di emulator/device
4. Test fungsionalitas:
   - Quick Add transaction
   - Swipe to delete
   - Navigation
   - Haptic feedback
   - Safe area handling

## Deployment

### Android

1. Update version di `android/app/build.gradle`
2. Build APK/AAB:
   ```bash
   cd android
   ./gradlew assembleRelease
   # atau
   ./gradlew bundleRelease
   ```
3. Upload ke Google Play Console

### iOS

1. Update version di `ios/App/App/Info.plist`
2. Open Xcode: `npm run cap:open:ios`
3. Archive dan upload ke App Store Connect

## Troubleshooting

### Build Error: "output: export" tidak kompatibel

Pastikan tidak ada API routes atau server-side features yang digunakan.

### Splash Screen tidak hilang

Check console untuk error di Capacitor initialization. Splash screen akan otomatis hilang setelah 500ms.

### Safe area tidak bekerja di iOS

Pastikan `viewportFit: "cover"` ada di viewport metadata.

### Haptic tidak bekerja

Haptic hanya bekerja di native platform. Check dengan `isNativePlatform()`.

## Next Steps

1. ✅ Setup Capacitor configuration
2. ✅ Integrate native plugins
3. ⏳ Add Android platform (`npx cap add android`)
4. ⏳ Add iOS platform (`npx cap add ios`)
5. ⏳ Test di emulator/device
6. ⏳ Setup signing & deployment
7. ⏳ Integrate haptic feedback ke UI interactions
8. ⏳ Optimize splash screen & app icons

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
