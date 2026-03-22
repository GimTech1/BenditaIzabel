"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type BenditaTheme = "dark" | "light";

const STORAGE_KEY = "bendita-theme";

type ThemeContextValue = {
  theme: BenditaTheme;
  setTheme: (t: BenditaTheme) => void;
  toggleTheme: () => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyDomTheme(theme: BenditaTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<BenditaTheme>("dark");
  const [mounted, setMounted] = useState(false);

  const setTheme = useCallback((t: BenditaTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    applyDomTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: BenditaTheme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyDomTheme(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    let initial: BenditaTheme = "dark";
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as BenditaTheme | null;
      if (stored === "light" || stored === "dark") {
        initial = stored;
      }
    } catch {
      /* ignore */
    }
    setThemeState(initial);
    applyDomTheme(initial);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, mounted }),
    [theme, setTheme, toggleTheme, mounted]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
