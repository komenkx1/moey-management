const pkg = require("./package.json");

/** @type {import('next').NextConfig} */
module.exports = {
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
  experimental: {
    externalDir: true,
    optimizePackageImports: ["lucide-react"]
  }
};
