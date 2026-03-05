import { useEffect, useCallback } from "react";
import { persistThemeMode, resolveThemeModeFromStorage } from "@/lib/dashboard-page-helpers";
import { useThemeState } from "@/store/kemana/hooks-granular";
import { setStatusBarDark, setStatusBarLight } from "@/lib/status-bar";

export function useTheme() {
    const { isDarkMode, setIsDarkMode } = useThemeState();

    useEffect(() => {
        const root = document.documentElement;
        const initialTheme = resolveThemeModeFromStorage(root);
        root.classList.toggle("dark", initialTheme === "dark");
        setIsDarkMode(initialTheme === "dark");
        persistThemeMode(initialTheme);

        // Set status bar sesuai theme
        if (initialTheme === "dark") {
            setStatusBarDark();
            if (typeof window !== "undefined") {
                import("@capacitor/keyboard").then(({ Keyboard, KeyboardStyle }) => {
                    Keyboard.setStyle({ style: KeyboardStyle.Dark }).catch(() => { });
                });
            }
        } else {
            setStatusBarLight();
            if (typeof window !== "undefined") {
                import("@capacitor/keyboard").then(({ Keyboard, KeyboardStyle }) => {
                    Keyboard.setStyle({ style: KeyboardStyle.Light }).catch(() => { });
                });
            }
        }
    }, [setIsDarkMode]);

    const toggleTheme = useCallback(() => {
        setIsDarkMode((current) => {
            const nextIsDark = !current;
            const root = document.documentElement;
            root.classList.toggle("dark", nextIsDark);
            persistThemeMode(nextIsDark ? "dark" : "light");

            // Update status bar saat theme berubah
            if (nextIsDark) {
                setStatusBarDark();
                if (typeof window !== "undefined") {
                    import("@capacitor/keyboard").then(({ Keyboard, KeyboardStyle }) => {
                        Keyboard.setStyle({ style: KeyboardStyle.Dark }).catch(() => { });
                    });
                }
            } else {
                setStatusBarLight();
                if (typeof window !== "undefined") {
                    import("@capacitor/keyboard").then(({ Keyboard, KeyboardStyle }) => {
                        Keyboard.setStyle({ style: KeyboardStyle.Light }).catch(() => { });
                    });
                }
            }

            return nextIsDark;
        });
    }, [setIsDarkMode]);

    return { isDarkMode, toggleTheme, setIsDarkMode };
}
