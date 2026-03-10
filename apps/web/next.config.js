const pkg = require("./package.json");
const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@kemana/core", "@kemana/storage"],
  outputFileTracingRoot: __dirname,
  // Static export untuk Capacitor
  output: "export",
  // Unoptimized images untuk static export
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version
  },
  // Ensure assets are served from the correct port in all environments
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  // Content Security Policy headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co",
              "frame-src 'self' https://*.supabase.co",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
            ].join("; "),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  experimental: {
    externalDir: true,
    optimizePackageImports: ["lucide-react"],
    // Enable instrumentation hook for Sentry
    instrumentationHook: true,
  }
};

// Sentry webpack plugin options
const sentryWebpackPluginOptions = {
  // Sentry organization and project (set via env vars)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps (set via env var)
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production builds
  dryRun: process.env.NODE_ENV !== "production",

  // Enable source map upload
  sourcemaps: {
    // Include source maps from .next directory
    assets: [".next/static/**/*", ".next/server/**/*"],
    // Ignore files
    ignore: ["node_modules"],
  },

  // Release version
  release: {
    name: pkg.version,
    // Create a release in Sentry
    create: process.env.NODE_ENV === "production",
    // Associate commits with the release
    setCommits: process.env.SENTRY_SET_COMMITS
      ? {
          auto: true,
        }
      : undefined,
  },

  // Enable telemetry
  telemetry: false,

  // Suppress logs in CI
  silent: process.env.CI === "true",

  // Configure source map path prefixes
  urlPrefix: process.env.SENTRY_URL_PREFIX || "~/",

  // Debug mode
  debug: process.env.SENTRY_DEBUG === "true",
};

// Export with Sentry config
module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
