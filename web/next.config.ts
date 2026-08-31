import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The desktop app loads a static export from disk; the Vercel deploy keeps
  // the regular server build, so export mode is opt-in via env.
  ...(process.env.NEXT_OUTPUT === "export" ? { output: "export" as const } : {}),
};

export default nextConfig;
