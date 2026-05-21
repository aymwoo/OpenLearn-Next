import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx", "scripts/**/*.test.ts"],
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
