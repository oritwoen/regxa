import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    reporters: "dot",
    projects: [
      { test: { name: "unit", include: ["test/unit/**/*.test.ts"], globals: true } },
      { test: { name: "e2e", include: ["test/e2e/**/*.test.ts"], globals: true } },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/types.ts", "src/**/*.test.ts"],
    },
  },
});
