"use client";

import { useEffect } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard } from "@capacitor/keyboard";
import { isNativePlatform } from "@/lib/capacitor";

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
      try {
        // Detect theme dari localStorage atau system
        const savedTheme = localStorage.getItem("theme-mode");
        const isDark = savedTheme === "dark" || 
                      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
        
        // Setup Status Bar sesuai theme
        if (isDark) {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#000000' });
        } else {
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#F7F8FA' });
        }

        // Setup Keyboard
        Keyboard.setAccessoryBarVisible({ isVisible: true });

        // Splash screen akan auto-hide setelah 2 detik (dari config)
        // Tidak perlu manual hide
      } catch (error) {
        console.error("Error initializing Capacitor:", error);
      }
    };

    initializeCapacitor();
  }, []);
}
