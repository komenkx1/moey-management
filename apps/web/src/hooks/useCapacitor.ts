"use client";

import { useEffect } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard } from "@capacitor/keyboard";
import { isNativePlatform } from "@/lib/capacitor";
import { resolveThemeModeFromStorage } from "@/lib/dashboard-page-helpers";
import { setStatusBarDark, setStatusBarLight } from "@/lib/status-bar";

/**
 * Hook untuk inisialisasi Capacitor plugins
 * Menangani splash screen, status bar, dan keyboard
 */
export function useCapacitor() {
  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    const initializeCapacitor = async () => {
      // Prioritaskan hide splash screen dulu agar user tidak stuck
      try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch (err) {
        console.error("Failed to hide splash screen:", err);
      }

      try {
        const isDark = resolveThemeModeFromStorage(document.documentElement) === "dark";

        // Setup Status Bar sesuai theme
        if (isDark) {
          await setStatusBarDark();
        } else {
          await setStatusBarLight();
        }

        // Setup Keyboard
        Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => { });
      } catch (error) {
        console.error("Error initializing Capacitor plugins:", error);
      }
    };

    initializeCapacitor();
  }, []);
}
