import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["src/tests/**/*.test.ts"],
    coverage: { reporter: ["text", "html"], include: ["src/**/*.ts"] }
  }
});

