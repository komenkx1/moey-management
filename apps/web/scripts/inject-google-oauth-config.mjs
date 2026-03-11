#!/usr/bin/env node

/**
 * Inject Google OAuth Configuration to Native Platforms
 * 
 * This script automatically injects Google OAuth URL schemes and client IDs
 * into iOS Info.plist and Android AndroidManifest.xml from .env.local
 * 
 * Usage:
 *   node scripts/inject-google-oauth-config.mjs
 * 
 * Requirements:
 *   - .env.local must exist with GOOGLE_IOS_CLIENT_ID
 *   - ios/App/App/Info.plist must exist (iOS platform added)
 *   - android/app/src/main/AndroidManifest.xml must exist (Android platform added)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Load environment variables
config({ path: resolve(rootDir, '.env.local') });
config({ path: resolve(rootDir, '.env') }); // fallback

const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID;
const CAP_APP_ID = process.env.CAP_APP_ID || 'com.kemana.app.dev';

console.log('🔧 Injecting Google OAuth Configuration...\n');

// ============================================================================
// iOS Info.plist Injection
// ============================================================================

function injectIOSConfig() {
  const infoPlistPath = resolve(rootDir, 'ios/App/App/Info.plist');
  
  if (!existsSync(infoPlistPath)) {
    console.log('⏭️  Skipping iOS: Info.plist not found (iOS platform not added)');
    return false;
  }

  if (!GOOGLE_IOS_CLIENT_ID) {
    console.log('⚠️  Warning: GOOGLE_IOS_CLIENT_ID not found in .env.local');
    console.log('   iOS Google OAuth will not work without this!');
    return false;
  }

  // Extract URL scheme from iOS client ID
  // Format: 881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2.apps.googleusercontent.com
  // URL Scheme: com.googleusercontent.apps.881771739660-3ccnh9ja0evs87tij88kem7r6gep1dp2
  const clientIdParts = GOOGLE_IOS_CLIENT_ID.split('.apps.googleusercontent.com')[0];
  const urlScheme = `com.googleusercontent.apps.${clientIdParts}`;

  console.log('📱 iOS Configuration:');
  console.log(`   Client ID: ${GOOGLE_IOS_CLIENT_ID}`);
  console.log(`   URL Scheme: ${urlScheme}`);

  let content = readFileSync(infoPlistPath, 'utf8');

  // Check if already configured
  if (content.includes('CFBundleURLTypes') && content.includes(urlScheme)) {
    console.log('   ✅ Already configured\n');
    return true;
  }

  // Remove existing CFBundleURLTypes if present (to avoid duplicates)
  content = content.replace(
    /<key>CFBundleURLTypes<\/key>\s*<array>[\s\S]*?<\/array>/g,
    ''
  );

  // Remove existing GIDClientID if present
  content = content.replace(
    /<key>GIDClientID<\/key>\s*<string>.*?<\/string>/g,
    ''
  );

  // Find the closing </dict></plist> and inject before it
  const injection = `\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${urlScheme}</string>
\t\t\t</array>
\t\t</dict>
\t</array>
\t<key>GIDClientID</key>
\t<string>${GOOGLE_IOS_CLIENT_ID}</string>
</dict>
</plist>`;

  content = content.replace('</dict>\n</plist>', injection);

  writeFileSync(infoPlistPath, content, 'utf8');
  console.log('   ✅ Injected successfully\n');
  return true;
}

// ============================================================================
// Android AndroidManifest.xml Injection
// ============================================================================

function injectAndroidConfig() {
  const manifestPath = resolve(rootDir, 'android/app/src/main/AndroidManifest.xml');
  
  if (!existsSync(manifestPath)) {
    console.log('⏭️  Skipping Android: AndroidManifest.xml not found (Android platform not added)');
    return false;
  }

  console.log('🤖 Android Configuration:');
  console.log(`   App ID: ${CAP_APP_ID}`);
  console.log(`   Deep Link: ${CAP_APP_ID}://oauth2redirect`);

  let content = readFileSync(manifestPath, 'utf8');

  // Check if already configured
  if (content.includes('oauth2redirect')) {
    console.log('   ✅ Already configured\n');
    return true;
  }

  // Find the MainActivity closing tag and inject before it
  const intentFilter = `
            <!-- Google OAuth Deep Link -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data
                    android:scheme="${CAP_APP_ID}"
                    android:host="oauth2redirect" />
            </intent-filter>`;

  // Find the last </intent-filter> inside MainActivity and inject after it
  const mainActivityRegex = /(<activity[^>]*android:name="\.MainActivity"[^>]*>[\s\S]*?<\/intent-filter>)/;
  
  if (mainActivityRegex.test(content)) {
    content = content.replace(mainActivityRegex, `$1${intentFilter}`);
    writeFileSync(manifestPath, content, 'utf8');
    console.log('   ✅ Injected successfully\n');
    return true;
  } else {
    console.log('   ⚠️  Warning: Could not find MainActivity in AndroidManifest.xml');
    console.log('   Please add the intent filter manually\n');
    return false;
  }
}

// ============================================================================
// Main Execution
// ============================================================================

function main() {
  let iosSuccess = false;
  let androidSuccess = false;

  try {
    iosSuccess = injectIOSConfig();
  } catch (error) {
    console.error('❌ iOS injection failed:', error.message);
  }

  try {
    androidSuccess = injectAndroidConfig();
  } catch (error) {
    console.error('❌ Android injection failed:', error.message);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (iosSuccess || androidSuccess) {
    console.log('✅ Google OAuth configuration injected successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: npx cap sync');
    console.log('  2. Test Google login on native apps');
    console.log('');
    console.log('📚 Documentation: ./GOOGLE_OAUTH_NATIVE_FIX.md');
  } else {
    console.log('⚠️  No platforms configured');
    console.log('');
    console.log('To add platforms:');
    console.log('  • Run: npm run cap:setup');
    console.log('  • Or manually: npx cap add ios / npx cap add android');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main();
