"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        "text-text-secondary hover:bg-surface-3 hover:text-text-primary",
        className
      )}
      aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
      title={theme === "dark" ? "Tema claro" : "Tema escuro"}
    >
      {!mounted ? (
        <Moon size={20} className="opacity-50" />
      ) : theme === "dark" ? (
        <>
          <Sun size={20} />
          Tema claro
        </>
      ) : (
        <>
          <Moon size={20} />
          Tema escuro
        </>
      )}
    </button>
  );
}
