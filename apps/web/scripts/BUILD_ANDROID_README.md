# Android APK/AAB Build Script

Script untuk build Android APK/AAB dengan package name yang berbeda untuk production, beta, dan development.

## Quick Start

```bash
# Build Beta APK (default)
npm run apk:android

# Build Production APK
npm run apk:android:prod

# Build Beta APK (explicit)
npm run apk:android:beta

# Build Production AAB untuk Play Store
npm run aab:android:prod
```

## Package Names & OAuth Client IDs

Script ini otomatis menggunakan OAuth Client ID yang sesuai berdasarkan package name:

| Environment | Package Name | OAuth Client ID |
|-------------|--------------|-----------------|
| **Production** | `com.kemana.app` | `GOOGLE_ANDROID_CLIENT_ID_PROD` |
| **Beta** | `com.kemana.app.beta` | `GOOGLE_ANDROID_CLIENT_ID` |
| **Development** | `com.kemana.app.dev` | `GOOGLE_ANDROID_CLIENT_ID` |

### Setup OAuth untuk Production

1. Buat OAuth Client ID baru di [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Tambahkan ke `.env.local`:
   ```bash
   GOOGLE_ANDROID_CLIENT_ID_PROD=xxx-prod.apps.googleusercontent.com
   ```
3. Build production akan otomatis menggunakan client ID ini

Script akan otomatis restore ke development setelah build selesai.

## Advanced Usage

### Custom Package Name

```bash
ANDROID_PACKAGE_NAME=com.custom.app \
ANDROID_APP_NAME="Custom App" \
npm run apk:android
```

### Skip Web Build (jika sudah build)

```bash
npm run apk:android -- --skip-web-build
```

### Build AAB untuk Play Store

```bash
npm run apk:android -- --aab
# atau
npm run aab:android:prod
```

### Jangan Restore ke Dev

```bash
npm run apk:android -- --no-restore-sync
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANDROID_PACKAGE_NAME` | `com.kemana.app.beta` | Package name untuk build |
| `ANDROID_APP_NAME` | `KeMana Beta` | Nama app untuk build |
| `ANDROID_RESTORE_PACKAGE_NAME` | `com.kemana.app.dev` | Package name setelah restore |
| `ANDROID_RESTORE_APP_NAME` | `KeMana Dev` | Nama app setelah restore |
| `ANDROID_BUILD_TYPE` | `release` | Build type: `release` atau `debug` |
| `ANDROID_OUTPUT_FORMAT` | `apk` | Format output: `apk` atau `aab` |
| `ANDROID_APK_OUTPUT_DIR` | `./build/android-apk` | Directory output |

## Output Location

File APK/AAB akan disimpan di:
```
apps/web/build/android-apk/
├── com.kemana.app-release.apk
├── com.kemana.app.beta-release.apk
└── com.kemana.app-release.aab
```

## Workflow

1. Build web app (`npm run build`)
2. Sync Capacitor dengan package name target
3. Build APK/AAB menggunakan Gradle
4. Copy output ke `build/android-apk/`
5. Restore project ke development variant

## Troubleshooting

### Gradle tidak ditemukan
Pastikan Android project sudah di-setup:
```bash
npx cap add android
```

### Build gagal
Cek Java version:
```bash
npm run cap:check-java
```

### Package name tidak berubah
Hapus cache dan rebuild:
```bash
rm -rf android/app/build
npm run apk:android
```
