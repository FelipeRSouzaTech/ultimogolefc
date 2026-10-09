import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes que usam um banco PostgreSQL de verdade. Exigem TEST_DATABASE_URL apontando para um banco
// EXCLUSIVO de testes, já migrado. Nunca aponte para o banco de desenvolvimento ou de produção.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
