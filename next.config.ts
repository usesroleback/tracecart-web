import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Self-contained server bundle, enabled only by apps/web/Dockerfile —
  // `next start` warns when this is on, so local builds keep the default.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // npm workspace: trace dependencies from the repo root, where they're hoisted.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default withNextIntl(nextConfig);
