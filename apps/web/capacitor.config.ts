/// <reference types="node" />
import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';
import { config as dotenvConfig } from 'dotenv';

// Load .env.local into process.env so Capacitor CLI can read it
dotenvConfig({ path: '.env.local' });
dotenvConfig({ path: '.env' }); // fallback

const appId = process.env.CAP_APP_ID ?? 'com.kemana.app.dev';
const appName = process.env.CAP_APP_NAME ?? 'KeMana Dev';

// Android needs different OAuth client ID for production package name
const isAndroidProduction = appId === 'com.kemana.app';
const androidClientId = isAndroidProduction && process.env.GOOGLE_ANDROID_CLIENT_ID_PROD
  ? process.env.GOOGLE_ANDROID_CLIENT_ID_PROD
  : process.env.GOOGLE_ANDROID_CLIENT_ID ?? "ENTER_YOUR_GOOGLE_ANDROID_CLIENT_ID_HERE";

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      launchFadeOutDuration: 300,
      androidSplashResourceName: 'splash',
      androidScaleType: 'FIT_CENTER',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#F7F8FA'
    },
    Keyboard: {
      resize: KeyboardResize.None
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? "ENTER_YOUR_GOOGLE_WEB_CLIENT_ID_HERE",
      iosClientId: process.env.GOOGLE_IOS_CLIENT_ID ?? "ENTER_YOUR_GOOGLE_IOS_CLIENT_ID_HERE",
      androidClientId: androidClientId,
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
