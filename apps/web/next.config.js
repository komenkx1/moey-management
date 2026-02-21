const path = require("path");
const pkg = require("./package.json");

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  transpilePackages: ["@kemana/core", "@kemana/storage"],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version
  },
  webpack: (config) => {
    config.resolve.modules.push(path.resolve(__dirname, "node_modules"));
    return config;
  }
};
