"use client";

import { useEffect } from "react";
import { isIOS, isStandalone } from "@/lib/pwa";

const IOS_STANDALONE_ATTR = "data-ios-standalone";

export default function SafeAreaSync() {
  useEffect(() => {
    const body = document.body;
    const media = typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)")
      : null;

    const applyMode = () => {
      if (isIOS() && isStandalone()) {
        body.setAttribute(IOS_STANDALONE_ATTR, "true");
        return;
      }

      body.removeAttribute(IOS_STANDALONE_ATTR);
    };

    applyMode();
    if (media) {
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", applyMode);
      } else {
        media.addListener(applyMode);
      }
    }
    window.addEventListener("pageshow", applyMode);

    return () => {
      if (media) {
        if (typeof media.removeEventListener === "function") {
          media.removeEventListener("change", applyMode);
        } else {
          media.removeListener(applyMode);
        }
      }
      window.removeEventListener("pageshow", applyMode);
    };
  }, []);

  return null;
}
