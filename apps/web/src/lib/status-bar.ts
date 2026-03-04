/**
 * Status Bar Utilities
 * Helper untuk mengatur status bar sesuai theme/context
 */

import { StatusBar, Style } from "@capacitor/status-bar";
import { isNativePlatform } from "./capacitor";

// Theme colors dari globals.css
const LIGHT_THEME_BG = '#F7F8FA';
const DARK_THEME_BG = '#000000';

/**
 * Set status bar untuk dark theme (light text)
 */
export async function setStatusBarDark() {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: DARK_THEME_BG });
  } catch (error) {
    console.warn("Status bar not available:", error);
  }
}

/**
 * Set status bar untuk light theme (dark text)
 */
export async function setStatusBarLight() {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: LIGHT_THEME_BG });
  } catch (error) {
    console.warn("Status bar not available:", error);
  }
}

/**
 * Set status bar dengan custom color
 */
export async function setStatusBarColor(color: string, style: 'light' | 'dark' = 'dark') {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color });
  } catch (error) {
    console.warn("Status bar not available:", error);
  }
}

/**
 * Hide status bar (fullscreen mode)
 */
export async function hideStatusBar() {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.hide();
  } catch (error) {
    console.warn("Status bar not available:", error);
  }
}

/**
 * Show status bar
 */
export async function showStatusBar() {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.show();
  } catch (error) {
    console.warn("Status bar not available:", error);
  }
}

/**
 * Set status bar overlay (iOS)
 * Membuat status bar transparent dan overlay di atas content
 */
export async function setStatusBarOverlay(overlay: boolean) {
  if (!isNativePlatform()) return;
  
  try {
    await StatusBar.setOverlaysWebView({ overlay });
  } catch (error) {
    console.warn("Status bar overlay not available:", error);
  }
}
