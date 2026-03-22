"use client";

import { Toaster } from "react-hot-toast";
import { useTheme } from "./ThemeProvider";

export function AppToaster() {
  const { theme, mounted } = useTheme();
  const isLight = mounted && theme === "light";

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: isLight ? "#ffffff" : "#0c1512",
          color: isLight ? "#082818" : "#f2faf6",
          border: isLight ? "1px solid #b8d4c4" : "1px solid #1f3d32",
        },
      }}
    />
  );
}
