"use client";

import { useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";

export function useCssVar(name: string, fallback = "") {
  const { theme } = useTheme();
  return useMemo(() => {
    void theme;
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }, [theme, name, fallback]);
}

export function useThemeColors() {
  const ink = useCssVar("--ink", "#fdfdfa");
  const ink2 = useCssVar("--ink2", "rgba(255,255,255,0.55)");
  const ink3 = useCssVar("--ink3", "rgba(255,255,255,0.28)");
  const acid = useCssVar("--acid", "#daff47");
  const border = useCssVar("--border", "rgba(255,255,255,0.07)");
  const green = useCssVar("--green", "#22c55e");
  const red = useCssVar("--red", "#ff3b30");
  const blue = useCssVar("--blue", "#3b82f6");
  const orange = useCssVar("--orange", "#f97316");
  const purple = useCssVar("--purple", "#a855f7");
  return { ink, ink2, ink3, acid, border, green, red, blue, orange, purple };
}

export function hexToRgba(color: string, alpha: number) {
  const hex = color.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return color;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
