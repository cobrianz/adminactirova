import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // This app lives inside the parent monorepo repo (which has its own
    // package-lock.json). Pin the app root so Turbopack resolves modules
    // against this project and not the parent Next.js project.
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
};

export default nextConfig;
