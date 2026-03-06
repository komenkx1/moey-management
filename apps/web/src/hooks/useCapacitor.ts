"use client";

import { useEffect } from "react";
import { SplashScreen } from "@capacitor/splash-screen";
import { Keyboard } from "@capacitor/keyboard";
import { getPlatform, isNativePlatform } from "@/lib/capacitor";
import { resolveThemeModeFromStorage } from "@/lib/dashboard-page-helpers";
import { setStatusBarDark, setStatusBarLight } from "@/lib/status-bar";

/**
 * Hook untuk inisialisasi Capacitor plugins
 * Menangani splash screen, status bar, keyboard translateY, dan auto-scroll
 *
 * Keyboard strategy:
 * - iOS: KeyboardResize.None + translateY body (--keyboard-height) agar konten naik tanpa gap hitam.
 * - Android: Jangan set --keyboard-height (tetap 0). Di Android, KeyboardResize.None tidak
 *   dihormati dan WebView tetap di-resize; bila kita tetap translateY akan terjadi efek ganda
 *   dan muncul area hitam. Dengan tidak translate, layout mengandalkan resize/pan sistem.
 * - PWA: hook tidak jalan (bukan native), tidak terpengaruh.
 */
export function useCapacitor() {
  useEffect(() => {
    if (!isNativePlatform()) {
      return;
    }

    const platform = getPlatform();
    document.body.setAttribute('data-platform', platform);

    let focusScrollTimer: ReturnType<typeof setTimeout> | null = null;
    let keyboardShowListener: { remove: () => void } | null = null;
    let keyboardHideListener: { remove: () => void } | null = null;
    let androidKeyboardDidHideListener: { remove: () => void } | null = null;

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
        Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => { });

        // Keyboard: set --keyboard-height untuk iOS (translateY) dan Android (min-height agar gap tidak scroll).
        const KEYBOARD_GAP_OFFSET_PX = 24;

        keyboardShowListener = await Keyboard.addListener('keyboardWillShow', (info) => {
          const height = Math.max(0, info.keyboardHeight - KEYBOARD_GAP_OFFSET_PX);
          document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
        });

        keyboardHideListener = await Keyboard.addListener('keyboardWillHide', () => {
          document.documentElement.style.setProperty('--keyboard-height', '0px');
        });

        // Android: viewport sering tidak restore ke tinggi penuh setelah keyboard tutup (area hitam).
        // Paksa scroll + dispatch resize agar layout kolaps kembali.
        if (platform === 'android') {
          androidKeyboardDidHideListener = await Keyboard.addListener('keyboardDidHide', () => {
            setTimeout(() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
              window.dispatchEvent(new Event('resize'));
            }, 150);
          });
        }
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

        // Delay 400ms agar keyboard muncul dan translateY stabil
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
      keyboardShowListener?.remove();
      keyboardHideListener?.remove();
      androidKeyboardDidHideListener?.remove();
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, []);
}
