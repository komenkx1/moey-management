const path = require("path");
const pkg = require("./package.json");

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  transpilePackages: ["@kemana/core", "@kemana/storage"],
  outputFileTracingRoot: __dirname,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version
  },
  // Ensure assets are served from the correct port in all environments
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  webpack: (config) => {
    config.resolve.modules.push(path.resolve(__dirname, "node_modules"));
    return config;
  }
};
