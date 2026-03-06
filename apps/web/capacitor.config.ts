/// <reference types="node" />
import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const appId = process.env.CAP_APP_ID ?? 'com.kemana.app.dev';
const appName = process.env.CAP_APP_NAME ?? 'KeMana Dev';

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
    }
  }
};

export default config;
