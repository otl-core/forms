import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  treeshake: true,
  sourcemap: true,
  onSuccess: `node -e "
    const fs = require('fs');
    for (const f of ['dist/index.js', 'dist/index.cjs']) {
      if (fs.existsSync(f)) {
        const content = fs.readFileSync(f, 'utf8');
        fs.writeFileSync(f, '\\"use client\\";\\n' + content);
      }
    }
  "`,
});
