import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.OPINIO_NEXT_DIST_DIR || ".next",
};

export default nextConfig;
