import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  turbopack: { root: resolve(__dirname, "..") },
  // The desktop app loads a static export from disk; the Vercel deploy keeps
  // the regular server build, so export mode is opt-in via env.
  ...(process.env.NEXT_OUTPUT === "export" ? { output: "export" as const } : {}),
};

export default nextConfig;
