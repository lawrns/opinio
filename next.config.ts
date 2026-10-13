import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.OPINIO_NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        // Application surfaces: not frameable by third-party origins. The
        // explicit referrer policy also keeps path/query identifiers out of
        // cross-origin Referer headers (same-origin navigation is unchanged,
        // so on-site analytics keep working).
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Embeddable widgets are served for cross-origin <iframe> use on
        // merchant sites (see src/components/WidgetsCustomizer.tsx), so they
        // must stay frameable and must not forward the host page URL.
        // Later entries override earlier ones for the same header key.
        source: "/widget/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
