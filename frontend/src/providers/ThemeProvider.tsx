import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const preferenceKey = "lrm_theme";
const systemQuery = "(prefers-color-scheme: dark)";
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(preferenceKey);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(storedTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(systemQuery).matches);
  const theme = preference ?? (systemDark ? "dark" : "light");

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const system = window.matchMedia(systemQuery);
    const syncSystem = () => setSystemDark(system.matches);
    const syncStorage = (event: StorageEvent) => {
      if (event.key === preferenceKey || event.key === null) setPreference(storedTheme());
    };
    syncSystem();
    system.addEventListener("change", syncSystem);
    window.addEventListener("storage", syncStorage);
    return () => {
      system.removeEventListener("change", syncSystem);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setPreference(next);
    try {
      localStorage.setItem(preferenceKey, next);
    } catch { /* Keep the in-page choice when storage is unavailable. */ }
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}
