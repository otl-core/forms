import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/**/*.ts", "src/**/*.tsx"],
  format: ["esm", "cjs"],
  bundle: false,
  dts: true,
  clean: true,
  sourcemap: true,
});
