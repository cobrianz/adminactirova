"use client";

import { useEffect } from "react";

export default function DevServiceWorkerReset() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // If a SW was registered from a previous prod build, it can cache old chunks
    // and cause ChunkLoadError timeouts during dev/hot reload.
    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch (_) {}

      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (_) {}
    })();
  }, []);

  return null;
}
