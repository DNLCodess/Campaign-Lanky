import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray pnpm-lock.yaml in the
  // home directory was confusing Next's auto-detection).
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The PVC registration exercise has closed. /register was printed on flyers
  // and shared on WhatsApp, so send that traffic somewhere useful rather than
  // to a 404. Temporary (307) — if registration reopens for the next cycle,
  // a cached 308 would be impossible to undo in people's browsers.
  async redirects() {
    return [{ source: "/register", destination: "/get-involved", permanent: false }];
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
