import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray pnpm-lock.yaml in the
  // home directory was confusing Next's auto-detection).
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Temporary: Unsplash stock photos for the hero slider until the client
    // provides real constituency photography.
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "atavwpoistostnqxmeal.supabase.co" },
    ],
  },
};

export default nextConfig;
