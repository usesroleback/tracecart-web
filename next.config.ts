import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// SVGR's default SVGO pass drops viewBox, so an icon drawn at 24px and shown
// smaller (width={12}) is cropped to its top-left corner. Keep it.
const svgr = {
  loader: "@svgr/webpack",
  options: {
    svgoConfig: { plugins: [{ name: "preset-default", params: { overrides: { removeViewBox: false } } }] },
  },
};

const nextConfig: NextConfig = {
  // Self-contained server bundle, enabled only by apps/web/Dockerfile —
  // `next start` warns when this is on, so local builds keep the default.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // NEXT_BUILD_CPUS caps build workers on low-memory machines (unset: Next's default).
  experimental: process.env.NEXT_BUILD_CPUS ? { cpus: Number(process.env.NEXT_BUILD_CPUS) } : undefined,
  // npm workspace: trace dependencies from the repo root, where they're hoisted.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      // app/icon.svg is Next's own favicon import, not a component.
      resourceQuery: { not: [/__next_metadata__/] },
      use: [svgr],
    });
    return config;
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: [svgr],
        as: "*.js",
      },
    },
  },
};

export default withNextIntl(nextConfig);
