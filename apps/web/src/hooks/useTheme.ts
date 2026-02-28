import { useEffect, useCallback } from "react";
import { persistThemeMode, resolveThemeModeFromStorage } from "@/lib/dashboard-page-helpers";
import { useThemeState } from "@/store/kemana/hooks-granular";

export function useTheme() {
    const { isDarkMode, setIsDarkMode } = useThemeState();

    useEffect(() => {
        const root = document.documentElement;
        const initialTheme = resolveThemeModeFromStorage(root);
        root.classList.toggle("dark", initialTheme === "dark");
        setIsDarkMode(initialTheme === "dark");
        persistThemeMode(initialTheme);
    }, [setIsDarkMode]);

    const toggleTheme = useCallback(() => {
        setIsDarkMode((current) => {
            const nextIsDark = !current;
            const root = document.documentElement;
            root.classList.toggle("dark", nextIsDark);
            persistThemeMode(nextIsDark ? "dark" : "light");
            return nextIsDark;
        });
    }, [setIsDarkMode]);

    return { isDarkMode, toggleTheme, setIsDarkMode };
}
