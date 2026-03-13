"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "kemana-landing-theme";
const LIGHT_THEME_COLOR = "#F7F8FA";
const DARK_THEME_COLOR = "#000000";

function getStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function syncThemeColor(theme) {
  let meta = document.querySelector('meta[name="theme-color"]');

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  syncThemeColor(theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const initialTheme = getStoredTheme() || getSystemTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (getStoredTheme()) {
        return;
      }

      const nextTheme = getSystemTheme();
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  function handleToggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {}

    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  const nextThemeLabel = theme === "dark" ? "terang" : "gelap";

  return (
    <button
      className="theme-toggle"
      type="button"
      data-theme={theme}
      aria-label={`Ganti ke mode ${nextThemeLabel}`}
      title={`Ganti ke mode ${nextThemeLabel}`}
      onClick={handleToggle}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb" />
      </span>
      <span className="theme-toggle-text">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
