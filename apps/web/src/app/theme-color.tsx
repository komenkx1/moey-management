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

export default function ThemeColorSync() {
  const pathname = usePathname();

  useEffect(() => {
    const color = getAppBackgroundColor();
    let meta = document.querySelector(
      'meta[name="theme-color"]'
    ) as HTMLMetaElement | null;

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }

    meta.content = color;
  }, [pathname]);

  return null;
}
