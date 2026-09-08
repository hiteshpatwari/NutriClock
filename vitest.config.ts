import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@nutriclock/domain": `${process.cwd()}/packages/domain/src/index.ts`,
      "@nutriclock/application": `${process.cwd()}/packages/application/src/index.ts`,
      "@nutriclock/persistence": `${process.cwd()}/packages/persistence/src/index.ts`,
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "packages/**/test/**/*.test.ts",
      "apps/mobile/test/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
  },
});
