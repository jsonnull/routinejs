/// <reference types="vitest/config" />
import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      rollupTypes: true,
      afterBuild: async () => {
        const { copyFile } = await import("fs/promises");
        await copyFile("dist/index.d.ts", "dist/index.d.cts");
      },
    }),
  ],
  test: {
    typecheck: {
      tsconfig: "./tsconfig.json",
      include: ["tests/**/*.test-d.ts"],
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "RoutineJS",
      formats: ["es", "cjs"],
      fileName: "routine-js",
    },
  },
});
