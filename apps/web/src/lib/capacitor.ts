/**
 * Capacitor Platform Detection & Utilities
 * Menyediakan helper untuk mendeteksi apakah app berjalan di native atau web
 */

import { Capacitor } from '@capacitor/core';

/**
 * Cek apakah app berjalan di platform native (iOS/Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Dapatkan platform saat ini
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

/**
 * Cek apakah berjalan di iOS native
 */
export function isNativeIOS(): boolean {
  return getPlatform() === 'ios';
}

/**
 * Cek apakah berjalan di Android native
 */
export function isNativeAndroid(): boolean {
  return getPlatform() === 'android';
}

/**
 * Cek apakah berjalan di web browser
 */
export function isWeb(): boolean {
  return getPlatform() === 'web';
}
