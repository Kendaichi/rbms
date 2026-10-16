import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tailwind v4 is wired through Turbopack's CSS loader (no postcss.config).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
