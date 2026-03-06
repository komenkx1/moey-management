"use client";

import { useEffect } from "react";
import { isIOS, isStandalone } from "@/lib/pwa";
import { isNativePlatform, isNativeIOS } from "@/lib/capacitor";

const IOS_STANDALONE_ATTR = "data-ios-standalone";
const PWA_STANDALONE_ATTR = "data-pwa-standalone";
const SAFE_HEADER_OFFSET_VAR = "--safe-header-offset";

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
    window.addEventListener("pageshow", applyMode);
    window.addEventListener("resize", applyMode);
    window.addEventListener("orientationchange", applyMode);
    window.visualViewport?.addEventListener("resize", applyMode);
    window.visualViewport?.addEventListener("scroll", applyMode);

    return () => {
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
