import type { NextConfig } from "next";

// GitHub Pages serves a project site under /<repo>; the deploy workflow sets this.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static HTML export: all live data comes from Supabase in the browser.
  output: "export",
  basePath,
  // Plain <a> links outside Next's router (the Expo app at /app) need the prefix too.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Pages serves folders, so /teams must be /teams/index.html.
  trailingSlash: true,
  images: { unoptimized: true },
  // Cache Components / Partial Prefetching need a server, so they are off for the static export.
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
