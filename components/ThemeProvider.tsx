"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

export type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextType = {
  mode: ThemeMode;
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "actirova-admin-theme";

const modeListeners = new Set<() => void>();

function emitMode() {
  modeListeners.forEach((l) => l());
}

function subscribeMode(callback: () => void) {
  modeListeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    modeListeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getModeSnapshot(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "system" ? stored : "light";
}

function getServerModeSnapshot(): ThemeMode {
  return "light";
}

function subscribeSystem(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSystemSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerSystemSnapshot(): boolean {
  return false;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(subscribeMode, getModeSnapshot, getServerModeSnapshot);
  const systemDark = useSyncExternalStore(subscribeSystem, getSystemSnapshot, getServerSystemSnapshot);
  const resolved: ResolvedTheme = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", resolved === "dark");
    el.classList.toggle("light", resolved === "light");
  }, [resolved]);

  const setMode = (next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    emitMode();
  };

  const toggle = () => {
    setMode(mode === "light" ? "dark" : mode === "dark" ? "system" : "light");
  };

  return (
    <ThemeContext.Provider value={{ mode, theme: resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={`Theme: ${mode}`}
      title={`Theme: ${mode}`}
      className={`inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${className}`}
    >
      {mode === "system" ? (
        <Monitor className="h-4 w-4" />
      ) : theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
