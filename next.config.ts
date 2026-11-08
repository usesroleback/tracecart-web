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
  // Self-contained server bundle, enabled only by the Dockerfile —
  // `next start` warns when this is on, so local builds keep the default.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // NEXT_BUILD_CPUS caps build workers on low-memory machines (unset: Next's default).
  experimental: process.env.NEXT_BUILD_CPUS ? { cpus: Number(process.env.NEXT_BUILD_CPUS) } : undefined,
  // NEXT_SKIP_TYPECHECK=1 skips the build's own type check (run `pnpm typecheck` instead), for the same machines.
  typescript: { ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === "1" },
  // Product photos (src/components/store/StoreImage.tsx): the hosts next/image
  // may fetch and resize, AVIF first. Other hosts' photos are shown as they are.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "placehold.co")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .map((hostname) => ({ protocol: "https" as const, hostname })),
  },
  // This folder is the whole project (no workspace above it).
  outputFileTracingRoot: __dirname,
  // Response headers that close common browser attacks (ADR-083). The policy
  // forbids framing, plugins and changing the base URL; scripts aren't
  // restricted yet (Clerk and Next's inline scripts need nonces first).
  poweredByHeader: false,
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "geolocation=(self), microphone=(), payment=()" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ];
    return [{ source: "/:path*", headers: security }];
  },
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
