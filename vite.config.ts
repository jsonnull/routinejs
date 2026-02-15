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
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "RoutineJS",
      formats: ["es", "cjs"],
      fileName: "routine-js",
    },
  },
});
