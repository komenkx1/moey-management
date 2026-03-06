"use client";

import { useEffect } from "react";
import { isIOS, isStandalone } from "@/lib/pwa";
import { isNativePlatform, isNativeIOS, isNativeAndroid } from "@/lib/capacitor";

const IOS_STANDALONE_ATTR = "data-ios-standalone";
const PWA_STANDALONE_ATTR = "data-pwa-standalone";
const SAFE_HEADER_OFFSET_VAR = "--safe-header-offset";
const KEYBOARD_HEIGHT_VAR = "--keyboard-height";

function readEnvSafeAreaTop(): number {
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.top = "0";
  probe.style.left = "0";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  probe.style.paddingTop = "env(safe-area-inset-top)";
  document.body.appendChild(probe);
  const computed = Number.parseFloat(window.getComputedStyle(probe).paddingTop);
  probe.remove();
  return Number.isFinite(computed) ? computed : 0;
}

function readVisualViewportTopInset(): number {
  const inset = window.visualViewport?.offsetTop ?? 0;
  return Number.isFinite(inset) ? inset : 0;
}

function inStandaloneMode(): boolean {
  if (isStandalone()) {
    return true;
  }

  if (typeof window.matchMedia !== "function") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

export default function SafeAreaSync() {
  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const media = typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)")
      : null;
    const mediaFullscreen = typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: fullscreen)")
      : null;
    const mediaMinimalUi = typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: minimal-ui)")
      : null;

    const applyMode = () => {
      // Prioritaskan native platform detection
      const isNative = isNativePlatform();
      const iosDevice = isNative ? isNativeIOS() : isIOS();
      const standalone = isNative || inStandaloneMode();

      const envInsetTop = readEnvSafeAreaTop();
      const visualInsetTop = readVisualViewportTopInset();
      const detectedInsetTop = Math.max(envInsetTop, visualInsetTop, 0);
      const effectiveInsetTop =
        iosDevice && standalone ? Math.max(detectedInsetTop, 44) : detectedInsetTop;
      root.style.setProperty(SAFE_HEADER_OFFSET_VAR, `${effectiveInsetTop}px`);

      if (iosDevice && standalone) {
        body.setAttribute(IOS_STANDALONE_ATTR, "true");
      } else {
        body.removeAttribute(IOS_STANDALONE_ATTR);
      }
      if (standalone) {
        body.setAttribute(PWA_STANDALONE_ATTR, "true");
      } else {
        body.removeAttribute(PWA_STANDALONE_ATTR);
      }
    };

    applyMode();
    if (media) {
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", applyMode);
      } else {
        media.addListener(applyMode);
      }
    }
    if (mediaFullscreen) {
      if (typeof mediaFullscreen.addEventListener === "function") {
        mediaFullscreen.addEventListener("change", applyMode);
      } else {
        mediaFullscreen.addListener(applyMode);
      }
    }
    if (mediaMinimalUi) {
      if (typeof mediaMinimalUi.addEventListener === "function") {
        mediaMinimalUi.addEventListener("change", applyMode);
      } else {
        mediaMinimalUi.addListener(applyMode);
      }
    }
    // iOS/Android: setelah keyboard hilang, viewport kadang tidak restore (offset sisa / area hitam).
    // Paksa scroll reset on focusout agar fixed bottom elements dan layout snap kembali.
    const handleKeyboardDismiss = (e: FocusEvent) => {
      const isIosStandalone = body.hasAttribute(IOS_STANDALONE_ATTR);
      const isAndroidNative = isNativeAndroid();
      if (!isIosStandalone && !isAndroidNative) return;
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.getAttribute("contenteditable"))
      ) {
        setTimeout(() => {
          const active = document.activeElement;
          const stillEditing =
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement ||
            (active instanceof HTMLElement && active.getAttribute("contenteditable"));
          if (!stillEditing) {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
          }
        }, 120);
      }
    };

    // PWA only: saat keyboard virtual terbuka, viewport mengecil → set --keyboard-height
    // agar body min-height dibatasi dan tidak ada gap yang bisa di-scroll (edge-to-edge tetap).
    // Di iOS Safari, visualViewport resize sering telat/tidak fire → pakai focusin/focusout + delay.
    const syncPwaKeyboardHeight = () => {
      if (isNativePlatform()) return;
      if (!inStandaloneMode()) return;
      const vv = window.visualViewport;
      if (!vv) return;
      const height = Math.max(0, Math.round(window.innerHeight - vv.height));
      root.style.setProperty(KEYBOARD_HEIGHT_VAR, `${height}px`);
    };

    const schedulePwaKeyboardSync = () => {
      if (isNativePlatform() || !inStandaloneMode()) return;
      syncPwaKeyboardHeight();
      [100, 350, 600].forEach((ms) => setTimeout(syncPwaKeyboardHeight, ms));
    };

    const clearPwaKeyboardHeight = () => {
      if (isNativePlatform() || !inStandaloneMode()) return;
      root.style.setProperty(KEYBOARD_HEIGHT_VAR, "0px");
    };

    const handlePwaFocusIn = (e: FocusEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        (t instanceof HTMLElement && t.getAttribute("contenteditable"))
      ) {
        schedulePwaKeyboardSync();
      }
    };

    const handlePwaFocusOut = (e: FocusEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        (t instanceof HTMLElement && t.getAttribute("contenteditable"))
      ) {
        setTimeout(() => {
          const active = document.activeElement;
          const stillEditing =
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement ||
            (active instanceof HTMLElement && active.getAttribute("contenteditable"));
          if (!stillEditing) clearPwaKeyboardHeight();
        }, 150);
      }
    };

    if (!isNativePlatform() && inStandaloneMode()) {
      syncPwaKeyboardHeight();
      window.visualViewport?.addEventListener("resize", syncPwaKeyboardHeight);
      window.visualViewport?.addEventListener("scroll", syncPwaKeyboardHeight);
      document.addEventListener("focusin", handlePwaFocusIn);
      document.addEventListener("focusout", handlePwaFocusOut);
    }

    document.addEventListener("focusout", handleKeyboardDismiss);
    window.addEventListener("pageshow", applyMode);
    window.addEventListener("resize", applyMode);
    window.addEventListener("orientationchange", applyMode);
    window.visualViewport?.addEventListener("resize", applyMode);
    window.visualViewport?.addEventListener("scroll", applyMode);

    return () => {
      if (!isNativePlatform() && inStandaloneMode()) {
        window.visualViewport?.removeEventListener("resize", syncPwaKeyboardHeight);
        window.visualViewport?.removeEventListener("scroll", syncPwaKeyboardHeight);
        document.removeEventListener("focusin", handlePwaFocusIn);
        document.removeEventListener("focusout", handlePwaFocusOut);
        root.style.setProperty(KEYBOARD_HEIGHT_VAR, "0px");
      }
      document.removeEventListener("focusout", handleKeyboardDismiss);
      if (media) {
        if (typeof media.removeEventListener === "function") {
          media.removeEventListener("change", applyMode);
        } else {
          media.removeListener(applyMode);
        }
      }
      if (mediaFullscreen) {
        if (typeof mediaFullscreen.removeEventListener === "function") {
          mediaFullscreen.removeEventListener("change", applyMode);
        } else {
          mediaFullscreen.removeListener(applyMode);
        }
      }
      if (mediaMinimalUi) {
        if (typeof mediaMinimalUi.removeEventListener === "function") {
          mediaMinimalUi.removeEventListener("change", applyMode);
        } else {
          mediaMinimalUi.removeListener(applyMode);
        }
      }
      window.removeEventListener("pageshow", applyMode);
      window.removeEventListener("resize", applyMode);
      window.removeEventListener("orientationchange", applyMode);
      window.visualViewport?.removeEventListener("resize", applyMode);
      window.visualViewport?.removeEventListener("scroll", applyMode);
    };
  }, []);

  return null;
}
