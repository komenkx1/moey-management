# Google OAuth Native Apps - Ready for Testing ✅

**Date:** 11 Maret 2026  
**Status:** ✅ CONFIGURATION COMPLETE - READY FOR DEVICE TESTING

---

## Current Status

Semua konfigurasi Google OAuth untuk native apps (iOS & Android) sudah selesai dan siap untuk testing di device/simulator.

### ✅ Completed Tasks

1. **iOS Configuration** - DONE
   - ✅ CFBundleURLTypes injected to Info.plist
   - ✅ GIDClientID configured
   - ✅ URL Scheme: `com.googleusercontent.apps.881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2`

2. **Android Configuration** - DONE
   - ✅ Intent filter injected to AndroidManifest.xml
   - ✅ Deep link configured: `com.kemana.app.dev://oauth2redirect`
   - ✅ androidClientId added to capacitor.config.ts

3. **Auto-Injection Script** - DONE
   - ✅ Script created: `scripts/inject-google-oauth-config.mjs`
   - ✅ Integrated with `npm run cap:setup`
   - ✅ Available as standalone: `npm run cap:inject-oauth`

---

## Testing Instructions

### Test di iOS Simulator/Device

```bash
# 1. Build app
cd apps/web
npm run build:mobile

# 2. Sync Capacitor (jika belum)
npx cap sync ios

# 3. Open di Xcode
npm run cap:open:ios

# 4. Run di simulator atau device
# - Pilih target device di Xcode
# - Click Run button (⌘R)

# 5. Test Google Login
# - Tap "Login with Google"
# - Complete sign-in flow
# - ✅ Should redirect back to app (no crash)
```

**Expected Result:**
- ✅ No crash dengan error "missing support for URL scheme"
- ✅ Google login flow completes successfully
- ✅ User logged in dan redirect ke dashboard

### Test di Android Emulator/Device

```bash
# 1. Build app
cd apps/web
npm run build:mobile

# 2. Sync Capacitor (jika belum)
npx cap sync android

# 3. Open di Android Studio
npm run cap:open:android

# 4. Run di emulator atau device
# - Pilih target device di Android Studio
# - Click Run button (Shift+F10)

# 5. Test Google Login
# - Tap "Login with Google"
# - Complete sign-in flow
# - ✅ Should redirect back to app (no error)
```

**Expected Result:**
- ✅ No error "Something went wrong"
- ✅ No error "Invalid audience value"
- ✅ Google login flow completes successfully
- ✅ User logged in dan redirect ke dashboard

---

## Verification Checklist

### Pre-Testing Verification

- [x] iOS Info.plist has CFBundleURLTypes
- [x] iOS Info.plist has GIDClientID
- [x] Android AndroidManifest.xml has oauth2redirect intent-filter
- [x] capacitor.config.ts has androidClientId
- [x] .env.local has all Google client IDs
- [ ] Google Cloud Console has all redirect URIs registered

### Google Cloud Console Verification

Pastikan redirect URIs berikut sudah terdaftar di Google Cloud Console:

**Web Client (881771739660-37ucm5vmibajcbsp9vikfo3cf4di2ima):**
```
https://oyxhohsxpbbsedidujvt.supabase.co/auth/v1/callback
http://localhost:3005/auth/callback
```

**iOS Client (881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2):**
```
com.googleusercontent.apps.881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2:/oauth2redirect
```

**Android Client (881771739660-setjp6gkehor4bq2etqjl992gs6s2fb3):**
```
com.kemana.app.dev:/oauth2redirect
```

**How to Check:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on each OAuth 2.0 Client ID
3. Check "Authorized redirect URIs" section
4. Add missing URIs if needed

---

## Troubleshooting

### iOS: Still Crashing?

**Check Xcode Console:**
```
Look for error message:
"Your app is missing support for the following URL schemes: ..."
```

**Solution:**
```bash
# Verify Info.plist
cat ios/App/App/Info.plist | grep -A 10 "CFBundleURLTypes"

# Should show:
# <key>CFBundleURLTypes</key>
# <array>
#   <dict>
#     <key>CFBundleURLSchemes</key>
#     <array>
#       <string>com.googleusercontent.apps.881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2</string>
#     </array>
#   </dict>
# </array>

# If not present, re-inject:
npm run cap:inject-oauth
npx cap sync ios
```

### Android: Still Showing Error?

**Check Logcat:**
```bash
adb logcat | grep -i "oauth\|google\|intent"
```

**Common Errors:**

1. **"Invalid audience value"**
   - Cause: Missing androidClientId in capacitor.config.ts
   - Solution: Already fixed, verify with:
     ```bash
     cat capacitor.config.ts | grep androidClientId
     ```

2. **"Redirect URI mismatch"**
   - Cause: Redirect URI not registered in Google Cloud Console
   - Solution: Add `com.kemana.app.dev:/oauth2redirect` to Android client

3. **"Something went wrong"**
   - Cause: Intent filter not configured
   - Solution: Verify AndroidManifest.xml:
     ```bash
     cat android/app/src/main/AndroidManifest.xml | grep -A 10 "oauth2redirect"
     ```

---

## Next Steps After Testing

### If Testing Successful ✅

1. **Document Results**
   - Screenshot successful login flow
   - Note any issues or edge cases
   - Update this document with test results

2. **Prepare for Production**
   - Test with production Google client IDs
   - Test on multiple devices (different iOS/Android versions)
   - Test with different Google accounts

3. **Deploy to App Stores**
   - Build release versions
   - Submit to App Store (iOS)
   - Submit to Google Play (Android)

### If Testing Failed ❌

1. **Collect Debug Info**
   - iOS: Xcode console logs
   - Android: Logcat output
   - Screenshot of error messages

2. **Check Configuration**
   - Verify all files have correct configuration
   - Check Google Cloud Console settings
   - Verify .env.local has correct values

3. **Re-run Injection**
   ```bash
   npm run cap:inject-oauth
   npx cap sync
   ```

4. **Report Issues**
   - Provide error logs
   - Describe steps to reproduce
   - Include device/OS version info

---

## Quick Commands Reference

```bash
# Re-inject OAuth config (if needed)
npm run cap:inject-oauth

# Sync Capacitor
npx cap sync

# Build for mobile
npm run build:mobile

# Open in IDEs
npm run cap:open:ios      # Xcode
npm run cap:open:android  # Android Studio

# Run on devices
npm run cap:run:ios       # iOS
npm run cap:run:android   # Android

# View logs
# iOS: Use Xcode console
adb logcat                # Android
```

---

## Configuration Files Summary

### iOS: `ios/App/App/Info.plist`
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.googleusercontent.apps.881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2</string>
        </array>
    </dict>
</array>
<key>GIDClientID</key>
<string>881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2.apps.googleusercontent.com</string>
```

### Android: `android/app/src/main/AndroidManifest.xml`
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="com.kemana.app.dev"
        android:host="oauth2redirect" />
</intent-filter>
```

### Capacitor: `capacitor.config.ts`
```typescript
GoogleAuth: {
  scopes: ["profile", "email"],
  serverClientId: process.env.GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,  // ✅ Added
  forceCodeForRefreshToken: true
}
```

---

## Environment Variables

```bash
# .env.local
GOOGLE_WEB_CLIENT_ID=881771739660-37ucm5vmibajcbsp9vikfo3cf4di2ima.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=881771739660-setjp6gkehor4bq2etqjl992gs6s2fb3.apps.googleusercontent.com
CAP_APP_ID=com.kemana.app.dev
```

---

## Documentation References

- **Implementation Details:** `GOOGLE_OAUTH_NATIVE_FIX.md`
- **Auto-Injection Script:** `GOOGLE_OAUTH_AUTO_INJECTION.md`
- **Capacitor Setup:** `CAPACITOR_SETUP_COMPLETE.md`

---

## Summary

✅ **All configuration complete!**

**What's Done:**
- iOS URL scheme configured
- Android deep link configured
- Auto-injection script working
- All files properly configured

**What's Next:**
- Test on iOS simulator/device
- Test on Android emulator/device
- Verify Google login works end-to-end
- Deploy to production if successful

**Ready for Testing:** YES ✅

---

**Last Updated:** 11 Maret 2026  
**Next Action:** Test Google login on native devices
