import path from "node:path";
import { fileURLToPath } from "node:url";
import "fake-indexeddb/auto";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "@kemana/core": path.resolve(rootDir, "../../packages/core"),
      "@kemana/storage": path.resolve(rootDir, "../../packages/storage/index.ts")
    }
  }
});
