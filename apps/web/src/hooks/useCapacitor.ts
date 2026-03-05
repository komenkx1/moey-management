"use client";

import { useEffect } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard } from "@capacitor/keyboard";
import { isNativePlatform } from "@/lib/capacitor";
import { resolveThemeModeFromStorage } from "@/lib/dashboard-page-helpers";
import { setStatusBarDark, setStatusBarLight } from "@/lib/status-bar";

/**
 * Hook untuk inisialisasi Capacitor plugins
 * Menangani splash screen, status bar, dan keyboard auto-scroll
 */
export function useCapacitor() {
  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    let focusScrollTimer: ReturnType<typeof setTimeout> | null = null;

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

    // Auto-scroll ke focused input saat keyboard muncul.
    // Menggunakan focusin event + delay supaya scroll terjadi SETELAH
    // keyboard + viewport resize selesai.
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.getAttribute('contenteditable'))
      ) {
        if (focusScrollTimer) clearTimeout(focusScrollTimer);

        // Delay 400ms agar keyboard muncul dan viewport resize stabil
        focusScrollTimer = setTimeout(() => {
          if (document.activeElement === target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Retry sekali lagi setelah 500ms untuk memastikan posisi benar
            setTimeout(() => {
              if (document.activeElement === target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 500);
          }
        }, 400);
      }
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      if (focusScrollTimer) clearTimeout(focusScrollTimer);
    };
  }, []);
}
