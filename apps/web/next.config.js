const pkg = require("./package.json");
const { withSentryConfig } = require("@sentry/nextjs");
const fs = require("node:fs");
const path = require("node:path");

function readScriptHashes() {
  const hashesPath = path.join(__dirname, "csp-hashes.json");

  if (!fs.existsSync(hashesPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(hashesPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.scriptHashes) ? parsed.scriptHashes : [];
  } catch {
    return [];
  }
}

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
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    // Exposed so Android can override the legacy GoogleAuth plugin's clientId at runtime.
    NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID,
  },
  // Ensure assets are served from the correct port in all environments
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  // Security headers with environment-aware CSP
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const scriptHashes = readScriptHashes();
    const quotedScriptHashes = scriptHashes.map((hash) => `'${hash}'`);
    
    // Production CSP for static export:
    // Inline scripts are whitelisted with build-generated hashes; inline styles remain
    // temporarily allowed because the current UI still uses style attributes/style props.
    const productionCSP = [
      "default-src 'self'",
      `script-src 'self' ${quotedScriptHashes.join(" ")}`.trim(),
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co",
      "frame-src 'self' https://*.supabase.co",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");
    
    // Development CSP: Relaxed for HMR and dev tools
    const developmentCSP = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co ws://localhost:* http://localhost:*",
      "frame-src 'self' https://*.supabase.co",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
    ].join("; ");
    
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: isProduction ? productionCSP : developmentCSP,
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
          // NEW: HSTS (only in production with HTTPS)
          ...(isProduction ? [{
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          }] : []),
          // NEW: Cross-Origin Isolation
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless", // Less strict than require-corp, better compatibility
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
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
