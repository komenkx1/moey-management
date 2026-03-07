"use client";

import React, { useEffect, useState } from "react";
import { isIOS, isStandalone } from "@/lib/pwa";
import { isNativePlatform, isNativeIOS, isNativeAndroid } from "@/lib/capacitor";

const IOS_STANDALONE_ATTR = "data-ios-standalone";
const PWA_STANDALONE_ATTR = "data-pwa-standalone";
const SAFE_HEADER_OFFSET_VAR = "--safe-header-offset";
const KEYBOARD_HEIGHT_VAR = "--keyboard-height";

const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development";

function isPwaKeyboardDebug(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.search.includes("pwa_keyboard_debug=1");
}

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
      // Debug: force PWA standalone + keyboard behavior hanya di PWA (bukan native)
      if (!isNativePlatform() && isPwaKeyboardDebug()) {
        body.setAttribute(PWA_STANDALONE_ATTR, "true");
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

    // ----- PWA only (bukan iOS/Android native): keyboard virtual -----
    // Semua block di bawah hanya jalan jika !isNativePlatform(). Native pakai useCapacitor + CSS data-platform.
    const syncPwaKeyboardHeight = () => {
      if (isNativePlatform()) return;
      const forcePwa = isPwaKeyboardDebug();
      if (!inStandaloneMode() && !forcePwa) return;
      const vv = window.visualViewport;
      if (!vv) return;
      const fromInner = Math.round(window.innerHeight - vv.height);
      const fromOuter =
        typeof window.outerHeight === "number"
          ? Math.round(window.outerHeight - vv.offsetTop - vv.height)
          : 0;
      let height = Math.max(0, fromInner, fromOuter);
      let usedFallback = false;
      // Fallback iOS: kadang kedua nilai 0 saat keyboard baru buka
      if (height === 0 && isIOS() && document.activeElement) {
        const active = document.activeElement;
        const isInput =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          (active instanceof HTMLElement && active.getAttribute("contenteditable"));
        if (isInput) {
          height = Math.min(320, Math.round((window.outerHeight || window.innerHeight) * 0.45));
          usedFallback = true;
        }
      }
      root.style.setProperty(KEYBOARD_HEIGHT_VAR, `${height}px`);

      if (isDev || forcePwa) {
        console.log("[PWA keyboard] sync", {
          innerHeight: window.innerHeight,
          outerHeight: typeof window.outerHeight === "number" ? window.outerHeight : "-",
          vvHeight: vv.height,
          vvOffsetTop: vv.offsetTop,
          fromInner,
          fromOuter,
          computedHeight: height,
          usedFallback,
        });
      }
    };

    const schedulePwaKeyboardSync = () => {
      if (isNativePlatform()) return;
      if (!inStandaloneMode() && !isPwaKeyboardDebug()) return;
      if (isDev || isPwaKeyboardDebug()) {
        console.log("[PWA keyboard] focusin → schedule sync");
      }
      syncPwaKeyboardHeight();
      [100, 350, 600, 1000].forEach((ms) => setTimeout(syncPwaKeyboardHeight, ms));
    };

    const clearPwaKeyboardHeight = () => {
      if (isNativePlatform()) return;
      if (!inStandaloneMode() && !isPwaKeyboardDebug()) return;
      root.style.setProperty(KEYBOARD_HEIGHT_VAR, "0px");
      if (isDev || isPwaKeyboardDebug()) {
        console.log("[PWA keyboard] focusout → clear --keyboard-height");
      }
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

    if (!isNativePlatform() && (inStandaloneMode() || isPwaKeyboardDebug())) {
      if (isDev || isPwaKeyboardDebug()) {
        console.log("[PWA keyboard] init", {
          standalone: inStandaloneMode(),
          forceDebug: isPwaKeyboardDebug(),
          displayMode: typeof window.matchMedia !== "undefined" && window.matchMedia("(display-mode: standalone)").matches ? "standalone" : "browser",
        });
      }
      syncPwaKeyboardHeight();
      window.visualViewport?.addEventListener("resize", syncPwaKeyboardHeight);
      window.visualViewport?.addEventListener("scroll", syncPwaKeyboardHeight);
      document.addEventListener("focusin", handlePwaFocusIn);
      document.addEventListener("focusout", handlePwaFocusOut);
    } else if (isDev && !isNativePlatform()) {
      console.log("[PWA keyboard] tidak aktif (hanya jalan di standalone atau ?pwa_keyboard_debug=1)", {
        standalone: inStandaloneMode(),
        urlHint: "Tambahkan ?pwa_keyboard_debug=1 di URL untuk tes di browser",
      });
    }

    document.addEventListener("focusout", handleKeyboardDismiss);
    window.addEventListener("pageshow", applyMode);
    window.addEventListener("resize", applyMode);
    window.addEventListener("orientationchange", applyMode);
    window.visualViewport?.addEventListener("resize", applyMode);
    window.visualViewport?.addEventListener("scroll", applyMode);

    return () => {
      if (!isNativePlatform() && (inStandaloneMode() || isPwaKeyboardDebug())) {
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

  const [debugInfo, setDebugInfo] = useState<{
    keyboardHeight: string;
    innerHeight: number;
    outerHeight: number;
    vvHeight: number;
    vvOffsetTop: number;
    fromInner: number;
    fromOuter: number;
  } | null>(null);

  useEffect(() => {
    if (isNativePlatform() || !isPwaKeyboardDebug() || typeof window === "undefined") return;
    const update = () => {
      const vv = window.visualViewport;
      const inner = window.innerHeight;
      const outer = typeof window.outerHeight === "number" ? window.outerHeight : 0;
      const vh = vv?.height ?? 0;
      const vtop = vv?.offsetTop ?? 0;
      setDebugInfo({
        keyboardHeight: document.documentElement.style.getPropertyValue("--keyboard-height") || "0px",
        innerHeight: inner,
        outerHeight: outer,
        vvHeight: vh,
        vvOffsetTop: vtop,
        fromInner: Math.round(inner - vh),
        fromOuter: outer ? Math.round(outer - vtop - vh) : 0,
      });
    };
    update();
    const t = setInterval(update, 400);
    return () => clearInterval(t);
  }, []);

  return !isNativePlatform() && isPwaKeyboardDebug() && debugInfo ? (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        left: 8,
        right: 8,
        zIndex: 99999,
        padding: "8px 10px",
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        fontSize: 11,
        fontFamily: "monospace",
        borderRadius: 6,
        pointerEvents: "none",
      }}
      aria-live="polite"
    >
      <strong>[PWA keyboard debug]</strong> key: {debugInfo.keyboardHeight} | inner: {debugInfo.innerHeight} outer: {debugInfo.outerHeight} |
      vv.h: {debugInfo.vvHeight} vv.top: {debugInfo.vvOffsetTop} | fromInner: {debugInfo.fromInner} fromOuter: {debugInfo.fromOuter}
    </div>
  ) : null;
}
