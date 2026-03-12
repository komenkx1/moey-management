# Google OAuth Production Setup

Panduan setup Google OAuth Client ID terpisah untuk production builds.

## Mengapa Perlu Client ID Terpisah?

Setiap package name Android memerlukan OAuth Client ID yang terdaftar dengan package name tersebut. Karena production menggunakan `com.kemana.app` (bukan `.dev` atau `.beta`), kita perlu Client ID terpisah.

**Note**: iOS tidak perlu client ID terpisah karena menggunakan bundle ID yang sama untuk semua environment.

## Setup di Google Cloud Console

### 1. Buka Google Cloud Console

Pergi ke [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)

### 2. Buat OAuth Client ID Baru untuk Android

1. Klik **Create Credentials** → **OAuth Client ID**
2. Pilih **Android**
3. Isi form:
   - **Name**: `KeMana Android Production`
   - **Package name**: `com.kemana.app`
   - **SHA-1 certificate fingerprint**: (sama dengan dev/beta)
   - **SHA-256 certificate fingerprint**: (sama dengan dev/beta)

### 3. Dapatkan SHA-1 Fingerprint

Jika belum punya, dapatkan dari keystore:

```bash
# Debug keystore (untuk testing)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release keystore (untuk production)
keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
```

Copy SHA-1 dan SHA-256 dari output.

## Update Environment Variables

Tambahkan Client ID baru ke `.env.local`:

```bash
# Development/Beta OAuth
GOOGLE_ANDROID_CLIENT_ID=xxx-dev.apps.googleusercontent.com

# Production Android OAuth
GOOGLE_ANDROID_CLIENT_ID_PROD=xxx-prod.apps.googleusercontent.com

# iOS (sama untuk semua environment)
GOOGLE_IOS_CLIENT_ID=xxx-ios.apps.googleusercontent.com
```

## Cara Kerja

Script build Android akan otomatis memilih Client ID yang tepat:

```javascript
// capacitor.config.ts
const isAndroidProduction = appId === 'com.kemana.app';

const androidClientId = isAndroidProduction && process.env.GOOGLE_ANDROID_CLIENT_ID_PROD
  ? process.env.GOOGLE_ANDROID_CLIENT_ID_PROD  // Pakai prod untuk Android
  : process.env.GOOGLE_ANDROID_CLIENT_ID;      // Pakai dev/beta untuk Android

// iOS selalu pakai GOOGLE_IOS_CLIENT_ID (tidak berubah)
```

## Testing

### Test Development Build
```bash
npm run cap:run:android
# Login dengan Google → harus berhasil
```

### Test Production Build
```bash
npm run apk:android:prod
# Install APK → Login dengan Google → harus berhasil
```

## Troubleshooting

### Error: "Developer Error" saat login

**Penyebab**: Client ID tidak cocok dengan package name atau SHA fingerprint.

**Solusi**:
1. Cek package name di Google Cloud Console
2. Pastikan SHA-1 sudah terdaftar
3. Tunggu 5-10 menit setelah update (propagasi)

### Error: "Sign in failed"

**Penyebab**: Environment variable tidak ter-load.

**Solusi**:
```bash
# Cek apakah env ter-load
cat .env.local | grep GOOGLE_ANDROID_CLIENT_ID_PROD

# Rebuild dengan clean
rm -rf android/app/build
npm run apk:android:prod
```

### SHA Fingerprint Berbeda

Jika menggunakan keystore berbeda untuk release:

1. Dapatkan SHA dari release keystore
2. Tambahkan SHA baru ke OAuth Client ID yang sama
3. Satu Client ID bisa punya multiple SHA fingerprints

## Keamanan

- **JANGAN** commit `.env.local` ke git
- **JANGAN** share Client ID di public
- Gunakan keystore yang aman untuk production
- Backup keystore di tempat yang aman

## Referensi

- [Google Sign-In for Android](https://developers.google.com/identity/sign-in/android/start-integrating)
- [Capacitor Google Auth Plugin](https://github.com/CodetrixStudio/CapacitorGoogleAuth)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
