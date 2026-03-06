"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const FALLBACK_THEME_COLOR = "#f6f4ef";

function getAppBackgroundColor(): string {
  if (typeof window === "undefined") {
    return FALLBACK_THEME_COLOR;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--app-bg")
    .trim();
  return value || FALLBACK_THEME_COLOR;
}

function syncMetaThemeColor() {
  const color = getAppBackgroundColor();
  let meta = document.querySelector(
    'meta[name="theme-color"]'
  ) as HTMLMetaElement | null;

  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }

  if (meta.content !== color) {
    meta.content = color;
  }
}

export default function ThemeColorSync() {
  const pathname = usePathname();

  useEffect(() => {
    syncMetaThemeColor();
  }, [pathname]);

  // Re-sync when dark class toggles on <html>
  useEffect(() => {
    const root = document.documentElement;

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "class") {
          syncMetaThemeColor();
          return;
        }
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return null;
}
