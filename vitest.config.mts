import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx", "scripts/**/*.test.ts", "tests/**/*.test.ts"],
    maxWorkers: 4,
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json"],
      include: ["src/actions/**"],
      exclude: [
        "src/**/*.test.**",
        "src/**/*.spec.**",
        "src/db/**",
        "src/app/api/**",
      ],
    },
  },
});
