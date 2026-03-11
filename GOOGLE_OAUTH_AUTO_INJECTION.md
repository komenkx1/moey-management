# Google OAuth Auto-Injection - Implementation Complete ✅

**Date:** 11 Maret 2026  
**Feature:** Automatic Google OAuth configuration injection  
**Status:** ✅ IMPLEMENTED

---

## Overview

Script otomatis untuk inject Google OAuth URL schemes dan client IDs ke native platform files (iOS Info.plist dan Android AndroidManifest.xml) dari environment variables.

**Benefits:**
- ✅ No manual editing of native files
- ✅ Consistent configuration across environments
- ✅ Easy setup for new developers
- ✅ Automatic during `cap:setup`
- ✅ Can be run manually anytime

---

## How It Works

### Automatic Injection (During Setup)

```bash
npm run cap:setup
```

**Flow:**
```
1. Build static export
2. Add iOS/Android platforms
3. Sync Capacitor
4. 🆕 Auto-inject Google OAuth config from .env.local
5. ✅ Ready to run!
```

### Manual Injection (Anytime)

```bash
npm run cap:inject-oauth
```

**Use cases:**
- After changing Google client IDs in .env.local
- After pulling latest code with updated .env.local.example
- When switching between dev/beta/prod environments

---

## Configuration Source

### Environment Variables (.env.local)

```bash
# iOS Client ID (required for iOS)
GOOGLE_IOS_CLIENT_ID=881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2.apps.googleusercontent.com

# App ID (used for Android deep link)
CAP_APP_ID=com.kemana.app.dev
```

### What Gets Injected

**iOS (Info.plist):**
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

**Android (AndroidManifest.xml):**
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

---

## Script Details

### File: `scripts/inject-google-oauth-config.mjs`

**Features:**
- ✅ Reads from .env.local (with .env fallback)
- ✅ Extracts URL scheme from iOS client ID
- ✅ Injects to iOS Info.plist
- ✅ Injects to Android AndroidManifest.xml
- ✅ Idempotent (safe to run multiple times)
- ✅ Removes duplicates automatically
- ✅ Clear console output with status

**Logic:**

1. **Load Environment Variables**
   ```javascript
   config({ path: '.env.local' });
   config({ path: '.env' }); // fallback
   ```

2. **Extract URL Scheme from iOS Client ID**
   ```javascript
   // Input: 881771739660-XXX.apps.googleusercontent.com
   // Output: com.googleusercontent.apps.881771739660-XXX
   const clientIdParts = GOOGLE_IOS_CLIENT_ID.split('.apps.googleusercontent.com')[0];
   const urlScheme = `com.googleusercontent.apps.${clientIdParts}`;
   ```

3. **Inject to iOS Info.plist**
   - Check if file exists
   - Remove existing CFBundleURLTypes (avoid duplicates)
   - Inject new configuration before `</dict></plist>`

4. **Inject to Android AndroidManifest.xml**
   - Check if file exists
   - Find MainActivity
   - Inject intent-filter after existing intent-filter

5. **Idempotent Check**
   - Skip if already configured
   - Show "Already configured" message

---

## Usage Examples

### First-Time Setup

```bash
# Clone repo
git clone https://github.com/your-org/kemana.git
cd kemana/apps/web

# Install dependencies
npm install

# Copy and configure .env.local
cp .env.local.example .env.local
# Edit .env.local with your Google client IDs

# Run setup (includes auto-injection)
npm run cap:setup
```

**Output:**
```
🚀 KeMana Capacitor Setup
==========================

🔨 Building static export...
✅ Build successful

Which platforms do you want to add?
1) Android only
2) iOS only (macOS required)
3) Both Android and iOS
Enter choice (1-3): 3

📱 Adding Android platform...
✅ Android platform added

📱 Adding iOS platform...
✅ iOS platform added

🔄 Syncing assets to native platforms...
✅ Sync finished

🔐 Injecting Google OAuth configuration...

📱 iOS Configuration:
   Client ID: 881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2.apps.googleusercontent.com
   URL Scheme: com.googleusercontent.apps.881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2
   ✅ Injected successfully

🤖 Android Configuration:
   App ID: com.kemana.app.dev
   Deep Link: com.kemana.app.dev://oauth2redirect
   ✅ Injected successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Google OAuth configuration injected successfully!

Next steps:
  1. Run: npx cap sync
  2. Test Google login on native apps

📚 Documentation: ./GOOGLE_OAUTH_NATIVE_FIX.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Setup complete!

Next steps:
  • Run Android: npm run cap:run:android
  • Run iOS: npm run cap:run:ios
  • Open Android Studio: npm run cap:open:android
  • Open Xcode: npm run cap:open:ios
```

### Update Google Client IDs

```bash
# Edit .env.local with new client IDs
vim .env.local

# Re-inject configuration
npm run cap:inject-oauth

# Sync to native platforms
npx cap sync
```

**Output:**
```
🔧 Injecting Google OAuth Configuration...

📱 iOS Configuration:
   Client ID: NEW-CLIENT-ID.apps.googleusercontent.com
   URL Scheme: com.googleusercontent.apps.NEW-CLIENT-ID
   ✅ Injected successfully

🤖 Android Configuration:
   App ID: com.kemana.app.dev
   Deep Link: com.kemana.app.dev://oauth2redirect
   ✅ Injected successfully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Google OAuth configuration injected successfully!
```

### Switch Environments (Dev → Beta → Prod)

```bash
# Development
CAP_APP_ID=com.kemana.app.dev npm run cap:inject-oauth

# Beta
CAP_APP_ID=com.kemana.app.beta npm run cap:inject-oauth

# Production
CAP_APP_ID=com.kemana.app npm run cap:inject-oauth
```

---

## Error Handling

### Missing .env.local

```
⚠️  Warning: GOOGLE_IOS_CLIENT_ID not found in .env.local
   iOS Google OAuth will not work without this!
```

**Solution:**
```bash
cp .env.local.example .env.local
# Edit .env.local and add GOOGLE_IOS_CLIENT_ID
```

### Platform Not Added

```
⏭️  Skipping iOS: Info.plist not found (iOS platform not added)
⏭️  Skipping Android: AndroidManifest.xml not found (Android platform not added)

⚠️  No platforms configured

To add platforms:
  • Run: npm run cap:setup
  • Or manually: npx cap add ios / npx cap add android
```

**Solution:**
```bash
npx cap add ios
npx cap add android
npm run cap:inject-oauth
```

### Already Configured

```
📱 iOS Configuration:
   Client ID: 881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2.apps.googleusercontent.com
   URL Scheme: com.googleusercontent.apps.881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2
   ✅ Already configured

🤖 Android Configuration:
   App ID: com.kemana.app.dev
   Deep Link: com.kemana.app.dev://oauth2redirect
   ✅ Already configured
```

**Note:** This is normal! Script is idempotent and safe to run multiple times.

---

## Integration with Existing Scripts

### Updated Scripts

**1. capacitor-setup.sh**
```bash
# Added after npx cap sync
echo ""
echo "🔐 Injecting Google OAuth configuration..."
node scripts/inject-google-oauth-config.mjs
```

**2. package.json**
```json
{
  "scripts": {
    "cap:setup": "bash scripts/capacitor-setup.sh",
    "cap:inject-oauth": "node scripts/inject-google-oauth-config.mjs"
  }
}
```

### Workflow Integration

**Before (Manual):**
```
1. npm run cap:setup
2. Manually edit ios/App/App/Info.plist
3. Manually edit android/app/src/main/AndroidManifest.xml
4. npx cap sync
5. Test
```

**After (Automatic):**
```
1. npm run cap:setup (includes auto-injection)
2. Test
```

**Savings:** 2 manual steps eliminated! 🎉

---

## Testing

### Test Script Directly

```bash
node scripts/inject-google-oauth-config.mjs
```

### Test with Different Environments

```bash
# Test with dev environment
CAP_APP_ID=com.kemana.app.dev node scripts/inject-google-oauth-config.mjs

# Test with beta environment
CAP_APP_ID=com.kemana.app.beta node scripts/inject-google-oauth-config.mjs

# Test with production environment
CAP_APP_ID=com.kemana.app node scripts/inject-google-oauth-config.mjs
```

### Verify Injection

**iOS:**
```bash
cat ios/App/App/Info.plist | grep -A 10 "CFBundleURLTypes"
```

**Android:**
```bash
cat android/app/src/main/AndroidManifest.xml | grep -A 10 "oauth2redirect"
```

---

## Troubleshooting

### Issue 1: Script Not Found

```
Error: Cannot find module 'scripts/inject-google-oauth-config.mjs'
```

**Solution:**
```bash
# Make sure you're in apps/web directory
cd apps/web
npm run cap:inject-oauth
```

### Issue 2: Permission Denied

```
Error: EACCES: permission denied, open 'ios/App/App/Info.plist'
```

**Solution:**
```bash
# Fix file permissions
chmod 644 ios/App/App/Info.plist
chmod 644 android/app/src/main/AndroidManifest.xml
```

### Issue 3: Invalid Client ID Format

```
Error: Cannot read property 'split' of undefined
```

**Solution:**
```bash
# Check .env.local has correct format
cat .env.local | grep GOOGLE_IOS_CLIENT_ID

# Should be:
GOOGLE_IOS_CLIENT_ID=881771739660-XXX.apps.googleusercontent.com
```

---

## Advanced Usage

### Custom Script Integration

You can integrate this script into your own build pipeline:

```javascript
// custom-build.mjs
import { execSync } from 'child_process';

console.log('Building app...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Injecting OAuth config...');
execSync('node scripts/inject-google-oauth-config.mjs', { stdio: 'inherit' });

console.log('Syncing Capacitor...');
execSync('npx cap sync', { stdio: 'inherit' });
```

### CI/CD Integration

```yaml
# .github/workflows/build-native.yml
- name: Inject Google OAuth Config
  run: npm run cap:inject-oauth
  env:
    GOOGLE_IOS_CLIENT_ID: ${{ secrets.GOOGLE_IOS_CLIENT_ID }}
    CAP_APP_ID: com.kemana.app
```

---

## Files Modified

### New Files (1)
1. **`apps/web/scripts/inject-google-oauth-config.mjs`**
   - Auto-injection script
   - +200 lines

### Modified Files (2)
2. **`apps/web/scripts/capacitor-setup.sh`**
   - Added auto-injection call
   - +4 lines

3. **`apps/web/package.json`**
   - Added `cap:inject-oauth` script
   - +1 line

**Total:** 3 files, +205 lines

---

## Benefits Summary

### For Developers ✅
- No manual editing of native files
- Consistent configuration
- Easy environment switching
- Less error-prone

### For Teams ✅
- Standardized setup process
- Easy onboarding for new developers
- Documented in code (not just docs)
- Version controlled (.env.local.example)

### For CI/CD ✅
- Automated builds
- Environment-specific configs
- No manual intervention needed
- Reproducible builds

---

## Future Enhancements

### 1. Support for Multiple Environments

```javascript
// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
config({ path: `.env.${env}.local` });
```

### 2. Validation

```javascript
// Validate client ID format
if (!GOOGLE_IOS_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
  throw new Error('Invalid iOS client ID format');
}
```

### 3. Backup Before Injection

```javascript
// Backup original files
fs.copyFileSync('ios/App/App/Info.plist', 'ios/App/App/Info.plist.backup');
```

### 4. Dry Run Mode

```bash
npm run cap:inject-oauth -- --dry-run
# Shows what would be injected without actually modifying files
```

---

## Conclusion

✅ **Google OAuth auto-injection implemented!**

**Key Features:**
- Automatic injection during `cap:setup`
- Manual injection with `cap:inject-oauth`
- Idempotent (safe to run multiple times)
- Clear console output
- Error handling

**Impact:**
- Eliminates 2 manual steps from setup
- Reduces setup errors
- Easier for new developers
- Better CI/CD integration

**Next Steps:**
1. Test with fresh setup: `npm run cap:setup`
2. Test manual injection: `npm run cap:inject-oauth`
3. Verify Google login works on native apps

🎉 **Ready for use!**
